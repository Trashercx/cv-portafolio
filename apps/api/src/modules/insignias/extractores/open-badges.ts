import {
  ContextoExtraccion,
  crearContextoExtraccion,
  Extractor,
  ExtractorNoAplica,
  VistaPreviaInsignia,
} from './tipos';
import {
  aFechaIso,
  extraerUrl,
  limpiarTexto,
  resolverUrlHttps,
  vistaVacia,
} from './utils';

type Json = Record<string, unknown>;

const TIPOS_ASSERTION = [
  'assertion',
  'openbadgecredential',
  'achievementcredential',
];

function esObjeto(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function comoLista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
}

function texto(v: unknown, max = 2000): string {
  return limpiarTexto(v, max);
}

/** `true` si el JSON parece un assertion / credencial de Open Badges. */
export function esAssertionOpenBadges(json: unknown): json is Json {
  if (!esObjeto(json)) return false;
  const tipos = comoLista(json.type).map((t) => String(t).toLowerCase());
  if (tipos.some((t) => TIPOS_ASSERTION.includes(t))) return true;
  const contexto = comoLista(json['@context']).map((c) =>
    typeof c === 'string' ? c.toLowerCase() : '',
  );
  return contexto.some(
    (c) => c.includes('openbadges') || c.includes('imsglobal.org/spec/ob'),
  );
}

/** Descarga un JSON por URL; `null` si no se pudo o no es un objeto. */
async function descargarJson(
  ctx: ContextoExtraccion,
  url: string,
  avisos: string[],
  que: string,
): Promise<Json | null> {
  try {
    const recurso = await ctx.descargar(url, {
      accept: 'application/ld+json, application/json',
    });
    const json: unknown = JSON.parse(recurso.buffer.toString('utf8'));
    return esObjeto(json) ? json : null;
  } catch (error) {
    avisos.push(
      `No se pudo leer ${que}: ${error instanceof Error ? error.message : 'error'}`,
    );
    return null;
  }
}

/** `image` como string o `{ id }` / `{ url }`. */
function urlDeImagen(imagen: unknown): string | null {
  if (typeof imagen === 'string') return imagen;
  if (esObjeto(imagen)) {
    return texto(imagen.id) || texto(imagen.url) || null;
  }
  return null;
}

/**
 * Convierte un assertion Open Badges 2.x (con `badge` URL o embebido) o 3.0
 * (`credentialSubject.achievement`) en vista previa. Los sub-recursos
 * (BadgeClass, Issuer) se descargan con `ctx` y sus fallos van a `avisos`.
 * Lo comparten `open-badges.ts` (assertion hosted) y `png-horneado.ts`.
 */
export async function vistaDeAssertion(
  assertion: Json,
  opciones: {
    ctx: ContextoExtraccion;
    urlOrigen: string | null;
    /** URL del assertion si se descargó de un enlace. */
    urlAssertion?: string;
    /** Imagen a usar si el BadgeClass no trae una (p. ej. el PNG horneado). */
    imagenRespaldo?: string;
  },
): Promise<VistaPreviaInsignia> {
  const { ctx, urlAssertion } = opciones;
  const vista = vistaVacia('open_badges', opciones.urlOrigen);
  const base = urlAssertion ?? 'https://invalid.example/';

  // Open Badges 3.0: el logro vive en credentialSubject.achievement.
  const sujeto = esObjeto(assertion.credentialSubject)
    ? assertion.credentialSubject
    : null;
  const logro3 = sujeto
    ? comoLista(sujeto.achievement).find(esObjeto)
    : undefined;

  let badge: Json | null = null;
  let baseBadge = base;
  if (logro3) {
    badge = logro3;
  } else if (esObjeto(assertion.badge)) {
    badge = assertion.badge;
  } else if (typeof assertion.badge === 'string') {
    const urlBadge = resolverUrlHttps(assertion.badge, base);
    if (urlBadge) {
      badge = await descargarJson(ctx, urlBadge, vista.avisos, 'el BadgeClass');
      baseBadge = urlBadge;
    } else {
      vista.avisos.push('El BadgeClass no tiene una URL https válida.');
    }
  }

  // Emisor: en 2.x `badge.issuer` (URL o embebido); en 3.0 `assertion.issuer`.
  let emisor: Json | null = null;
  const refEmisor = logro3 ? assertion.issuer : badge?.issuer;
  if (esObjeto(refEmisor)) {
    emisor = refEmisor;
  } else if (typeof refEmisor === 'string') {
    const urlEmisor = resolverUrlHttps(refEmisor, baseBadge);
    if (urlEmisor) {
      emisor = await descargarJson(ctx, urlEmisor, vista.avisos, 'el emisor');
    }
  }

  vista.nombre = texto(badge?.name, 200);
  vista.descripcion = texto(badge?.description, 5000) || null;
  vista.emisor = texto(emisor?.name, 200);
  vista.fecha_emision = aFechaIso(
    assertion.issuedOn ?? assertion.validFrom ?? assertion.issuanceDate,
  );
  vista.fecha_expiracion = aFechaIso(
    assertion.expires ?? assertion.validUntil ?? assertion.expirationDate,
  );

  const habilidades = [
    ...comoLista(badge?.alignment).map((a) =>
      esObjeto(a) ? texto(a.targetName, 100) : '',
    ),
    ...comoLista(badge?.tags ?? badge?.tag).map((t) => texto(t, 100)),
  ].filter(Boolean);
  vista.habilidades = [...new Set(habilidades)];

  const idAssertion = texto(assertion.id);
  vista.id_externo = idAssertion || null;
  vista.url_verificacion =
    (idAssertion && resolverUrlHttps(idAssertion, base)) ||
    urlAssertion ||
    null;

  const refImagen = urlDeImagen(badge?.image) ?? urlDeImagen(assertion.image);
  const urlImagen =
    (refImagen && resolverUrlHttps(refImagen, baseBadge)) ||
    opciones.imagenRespaldo ||
    null;
  vista.imagen = urlImagen ? { url: urlImagen } : null;
  if (!urlImagen) {
    vista.avisos.push('No se encontró una imagen https para la insignia.');
  }
  if (!vista.nombre) {
    vista.avisos.push('No se pudo leer el nombre de la insignia; complétalo.');
  }
  return vista;
}

/** Open Badges hosted: la URL responde el assertion JSON / JSON-LD. */
export const openBadgesExtractor: Extractor = {
  acepta: (entrada) => extraerUrl(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const url = extraerUrl(entrada) as string;
    const recurso = await ctx.descargar(url, {
      accept: 'application/ld+json, application/json',
    });

    const pareceJson =
      recurso.contentType.includes('json') ||
      recurso.buffer.subarray(0, 1).toString() === '{';
    if (!pareceJson) throw new ExtractorNoAplica();

    let json: unknown;
    try {
      json = JSON.parse(recurso.buffer.toString('utf8'));
    } catch {
      throw new ExtractorNoAplica();
    }
    if (!esAssertionOpenBadges(json)) throw new ExtractorNoAplica();

    return vistaDeAssertion(json, {
      ctx,
      urlOrigen: entrada.trim(),
      urlAssertion: recurso.urlFinal,
    });
  },
};
