import { generarSvgClaudeAcademy } from './claude-academy-svg';
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
  MAX_DATA_URI_IMAGEN,
  vistaVacia,
} from './utils';

/**
 * Claude Academy (Fase 7i, UC-35): `https://academy.claude.com/verify/<código>`.
 *
 * Caso tipo "página que se dibuja en el navegador": el HTML no trae
 * metadatos ni imagen, solo una aplicación que consulta un API público y
 * pinta la insignia. El extractor llama a ese mismo API (Connect-RPC en
 * JSON, sin credenciales) y, como no existe un archivo de imagen, genera la
 * insignia como SVG con los datos verificados (`claude-academy-svg.ts`). La
 * vista previa la lleva como `data:image/svg+xml;base64,…` y "Guardar" la
 * sube a la biblioteca como cualquier imagen remota.
 *
 * Para otro proveedor del mismo tipo: anclar el host en `proveedores.ts`,
 * leer su API pública con `ctx.descargar(..., { postJson })` o un GET, y
 * generar o descargar la imagen.
 */
const RE_CLAUDE_ACADEMY =
  /^https:\/\/academy\.claude\.com\/verify\/([A-Za-z0-9_-]{8,128})(?:[/?#]\S*)?$/i;

export const URL_API_CLAUDE_ACADEMY =
  'https://academy.claude.com/api/anthropic.academy_public.api.v1alpha.AcademyPublicService/VerifyCertificate';

const EMISOR_CLAUDE_ACADEMY = 'Anthropic · Claude Academy';

const ORIGEN = 'https://academy.claude.com';
const RE_SCRIPT_PRINCIPAL = /\/assets\/v1\/index-[A-Za-z0-9_-]+\.js/;
const RE_CHUNK_CURSOS = /["'/](courses-[A-Za-z0-9_-]+\.js)/;
/** Plazo total de la búsqueda del color: es cosmético, no debe frenar la importación. */
export const PLAZO_CATALOGO_MS = 6000;
const RE_CURSO_EN_CATALOGO =
  /kind:"course",id:"([A-Za-z0-9_-]{4,64})",visibility:"\w+",shared:\{title:"([^"]{1,300})"/g;

const normalizarTitulo = (titulo: string) =>
  titulo.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Id del curso en el catálogo público de la página (el bundle de la
 * aplicación), para pintar la insignia con el mismo color que el original.
 * Es una lectura frágil por naturaleza (nombres de archivo con hash), así
 * que cualquier fallo devuelve `null` y la insignia usa el título.
 */
export async function idDeCursoEnCatalogo(
  ctx: ContextoExtraccion,
  curso: string,
  plazoMs = PLAZO_CATALOGO_MS,
): Promise<string | null> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<null>((resolver) => {
    temporizador = setTimeout(() => resolver(null), plazoMs);
  });
  try {
    // Plazo GLOBAL de las tres descargas (cada una además tiene el suyo).
    return await Promise.race([buscarIdDeCurso(ctx, curso, plazoMs), vencido]);
  } finally {
    clearTimeout(temporizador);
  }
}

async function buscarIdDeCurso(
  ctx: ContextoExtraccion,
  curso: string,
  plazoMs: number,
): Promise<string | null> {
  try {
    const opciones = { maxBytes: 4 * 1024 * 1024, timeoutMs: plazoMs };
    const pagina = await ctx.descargar(`${ORIGEN}/`, {
      ...opciones,
      accept: 'text/html',
    });
    const principal = RE_SCRIPT_PRINCIPAL.exec(pagina.buffer.toString('utf8'));
    if (!principal) return null;
    const indice = await ctx.descargar(`${ORIGEN}${principal[0]}`, opciones);
    const chunk = RE_CHUNK_CURSOS.exec(indice.buffer.toString('utf8'));
    if (!chunk) return null;
    const catalogo = await ctx.descargar(
      `${ORIGEN}/assets/v1/${chunk[1]}`,
      opciones,
    );
    const buscado = normalizarTitulo(curso);
    for (const m of catalogo.buffer
      .toString('utf8')
      .matchAll(RE_CURSO_EN_CATALOGO)) {
      if (normalizarTitulo(m[2]) === buscado) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function codigoDeClaudeAcademy(entrada: string): string | null {
  const url = extraerUrl(entrada);
  return url ? (RE_CLAUDE_ACADEMY.exec(url)?.[1] ?? null) : null;
}

interface RespuestaVerificacion {
  valid?: boolean;
  certificateName?: string;
  courseTitle?: string;
  issuedAt?: string;
}

export const claudeAcademyExtractor: Extractor = {
  acepta: (entrada) => codigoDeClaudeAcademy(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const codigo = codigoDeClaudeAcademy(entrada) as string;
    const url = `https://academy.claude.com/verify/${codigo}`;

    const recurso = await ctx.descargar(URL_API_CLAUDE_ACADEMY, {
      accept: 'application/json',
      tipos: ['application/json'],
      maxBytes: 64 * 1024,
      postJson: {
        cuerpo: { verifyCode: codigo },
        cabeceras: { 'Connect-Protocol-Version': '1' },
      },
    });

    let datos: RespuestaVerificacion;
    try {
      datos = JSON.parse(
        recurso.buffer.toString('utf8'),
      ) as RespuestaVerificacion;
    } catch {
      throw new ExtractorNoAplica('La respuesta de Claude Academy no es JSON');
    }

    if (!datos || datos.valid !== true) {
      return vistaVacia('claude_academy', entrada.trim(), [
        'Claude Academy no pudo verificar esta insignia: revisa el enlace.',
      ]);
    }

    const curso =
      limpiarTexto(datos.courseTitle, 200) || 'Claude Academy course';
    const titular =
      limpiarTexto(datos.certificateName, 120) || 'Claude Academy learner';

    const vista = vistaVacia('claude_academy', entrada.trim(), [
      'Insignia verificada en Claude Academy. La imagen se generó con los datos verificados porque la página no publica un archivo de imagen.',
    ]);
    vista.nombre = curso;
    vista.emisor = EMISOR_CLAUDE_ACADEMY;
    vista.fecha_emision = aFechaIso(datos.issuedAt);
    // Las insignias de Claude Academy no caducan.
    vista.fecha_expiracion = null;
    vista.url_verificacion = url;
    vista.id_externo = codigo;
    vista.descripcion = `Insignia de finalización del curso "${curso}" emitida a ${titular}.`;

    const svg = generarSvgClaudeAcademy({
      curso,
      idCurso: await idDeCursoEnCatalogo(ctx, curso),
      titular,
      emitidaIso: datos.issuedAt ?? null,
    });
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
    if (dataUri.length <= MAX_DATA_URI_IMAGEN) {
      vista.imagen = { url: dataUri, ancho: 1650, alto: 1125, formato: 'svg' };
    } else {
      vista.avisos.push(
        'No se pudo generar la imagen: súbela en la pestaña Subir archivo.',
      );
    }
    return vista;
  },
};
