import { inflateSync } from 'zlib';
import { sharp } from '../../media/sharp';
import { validarImagen } from '../../media/validar-imagen';
import { esAssertionOpenBadges, vistaDeAssertion } from './open-badges';
import {
  ContextoExtraccion,
  crearContextoExtraccion,
  Extractor,
  ExtractorNoAplica,
  VistaPreviaInsignia,
} from './tipos';
import { extraerUrl } from './utils';

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CLAVE = 'openbadges';

/** Dato horneado: el assertion en sí o la URL donde está alojado. */
export interface OpenBadgesHorneado {
  assertion?: Record<string, unknown>;
  url?: string;
}

export function esPng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(FIRMA_PNG);
}

/**
 * Valor del chunk `iTXt` o `tEXt` con keyword `openbadges` de un PNG.
 * `null` si no hay (o el PNG está truncado/corrupto).
 */
export function leerChunkOpenBadges(buffer: Buffer): string | null {
  if (!esPng(buffer)) return null;
  let pos = 8;
  while (pos + 12 <= buffer.length) {
    const longitud = buffer.readUInt32BE(pos);
    const tipo = buffer.toString('latin1', pos + 4, pos + 8);
    const inicio = pos + 8;
    const fin = inicio + longitud;
    if (fin + 4 > buffer.length) return null;
    if (tipo === 'tEXt' || tipo === 'iTXt') {
      const datos = buffer.subarray(inicio, fin);
      const cero = datos.indexOf(0);
      if (cero > 0 && datos.toString('latin1', 0, cero) === CLAVE) {
        if (tipo === 'tEXt') return datos.toString('latin1', cero + 1);
        // iTXt: flag, método, idioma\0, keyword traducida\0, texto.
        const comprimido = datos[cero + 1] === 1;
        const finIdioma = datos.indexOf(0, cero + 3);
        if (finIdioma < 0) return null;
        const finTraducida = datos.indexOf(0, finIdioma + 1);
        if (finTraducida < 0) return null;
        const cuerpo = datos.subarray(finTraducida + 1);
        try {
          return (comprimido ? inflateSync(cuerpo) : cuerpo).toString('utf8');
        } catch {
          return null;
        }
      }
    }
    if (tipo === 'IEND') return null;
    pos = fin + 4;
  }
  return null;
}

/** Interpreta el valor horneado: JSON, JWS (payload JSON) o URL. */
function interpretarValor(valor: string): OpenBadgesHorneado | null {
  const v = valor.trim();
  if (v.startsWith('{')) {
    try {
      const json: unknown = JSON.parse(v);
      return esAssertionOpenBadges(json) ? { assertion: json } : null;
    } catch {
      return null;
    }
  }
  if (/^https:\/\//i.test(v)) return { url: v };
  const partes = v.split('.');
  if (partes.length === 3) {
    try {
      const json: unknown = JSON.parse(
        Buffer.from(partes[1], 'base64url').toString('utf8'),
      );
      return esAssertionOpenBadges(json) ? { assertion: json } : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Elemento `openbadges:assertion` de un SVG (`verify` = URL hosted, o JSON en el cuerpo). */
export function leerOpenBadgesDeSvg(svg: string): OpenBadgesHorneado | null {
  const m = svg.match(
    /<openbadges:assertion\b([^>]*)>([\s\S]*?)<\/openbadges:assertion>/i,
  );
  if (!m) return null;
  const cuerpo = m[2].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim();
  const desdeCuerpo = cuerpo ? interpretarValor(cuerpo) : null;
  if (desdeCuerpo) return desdeCuerpo;
  const verify = m[1].match(/\bverify\s*=\s*["']([^"']+)["']/i)?.[1];
  return verify && /^https:\/\//i.test(verify) ? { url: verify } : null;
}

/**
 * Busca Open Badges horneado en un archivo PNG o SVG ya en memoria.
 * `null` si el archivo no lo trae.
 */
export function leerOpenBadgesHorneado(
  buffer: Buffer,
  mimetype: string,
): OpenBadgesHorneado | null {
  if (mimetype === 'image/png' || esPng(buffer)) {
    const valor = leerChunkOpenBadges(buffer);
    return valor ? interpretarValor(valor) : null;
  }
  if (mimetype === 'image/svg+xml') {
    return leerOpenBadgesDeSvg(buffer.toString('utf8'));
  }
  return null;
}

/**
 * Convierte lo horneado en vista previa: si trae el assertion lo usa; si
 * trae una URL, la descarga (JSON) y la usa. `imagenRespaldo` es la imagen
 * del propio archivo.
 */
export async function vistaDeHorneado(
  horneado: OpenBadgesHorneado,
  opciones: {
    ctx: ContextoExtraccion;
    urlOrigen: string | null;
    imagenRespaldo?: string;
  },
): Promise<VistaPreviaInsignia> {
  let assertion = horneado.assertion;
  let urlAssertion = horneado.url;
  if (!assertion && horneado.url) {
    const recurso = await opciones.ctx.descargar(horneado.url, {
      accept: 'application/ld+json, application/json',
    });
    const json: unknown = JSON.parse(recurso.buffer.toString('utf8'));
    if (!esAssertionOpenBadges(json)) throw new ExtractorNoAplica();
    assertion = json;
    urlAssertion = recurso.urlFinal;
  }
  if (!assertion) throw new ExtractorNoAplica();
  return vistaDeAssertion(assertion, {
    ctx: opciones.ctx,
    urlOrigen: opciones.urlOrigen,
    urlAssertion,
    imagenRespaldo: opciones.imagenRespaldo,
  });
}

/** Dimensiones de la imagen para la vista previa (best-effort). */
export async function dimensionesDe(
  buffer: Buffer,
): Promise<{ ancho?: number; alto?: number; formato?: string }> {
  try {
    const { width, height, format } = await sharp(buffer).metadata();
    return { ancho: width, alto: height, formato: format };
  } catch {
    return {};
  }
}

/** PNG (o SVG) en una URL con el assertion Open Badges horneado. */
export const pngHorneadoExtractor: Extractor = {
  acepta: (entrada) => extraerUrl(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const url = extraerUrl(entrada) as string;
    const recurso = await ctx.descargar(url, {
      accept: 'image/png, image/svg+xml',
    });
    if (
      recurso.contentType !== 'image/png' &&
      recurso.contentType !== 'image/svg+xml'
    ) {
      throw new ExtractorNoAplica();
    }
    // Tipo por contenido: un cuerpo que no es PNG/SVG limpio no aplica aquí.
    const real = await validarImagen(recurso.buffer);
    if (!real || (real.mime !== 'image/png' && real.mime !== 'image/svg+xml')) {
      throw new ExtractorNoAplica();
    }
    const horneado = leerOpenBadgesHorneado(recurso.buffer, real.mime);
    if (!horneado) throw new ExtractorNoAplica();

    const vista = await vistaDeHorneado(horneado, {
      ctx,
      urlOrigen: entrada.trim(),
      imagenRespaldo: recurso.urlFinal,
    });
    if (vista.imagen && vista.imagen.url === recurso.urlFinal) {
      Object.assign(vista.imagen, await dimensionesDe(recurso.buffer));
    }
    return vista;
  },
};
