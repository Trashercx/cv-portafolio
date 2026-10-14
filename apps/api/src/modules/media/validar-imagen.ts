import { sharp } from './sharp';

/**
 * Validacion real de imagenes (Fase 7d, UC-09/UC-35): el tipo se decide por
 * CONTENIDO, nunca por el MIME declarado por el cliente o el servidor remoto.
 *
 * - Raster (PNG/JPEG/WebP/AVIF): `sharp(buffer).metadata()` debe reconocer el
 *   formato y devolver `width` y `height`.
 * - SVG: debe empezar (tras BOM, espacios, prologo XML y comentarios) por
 *   `<svg`, y no puede contener nada activo (scripts, manejadores `on*`,
 *   `javascript:`, `foreignObject`, entidades, `data:` o enlaces externos).
 */

export interface ImagenValidada {
  /** MIME derivado del contenido (el que se guarda como `ContentType`). */
  mime: string;
  formato: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'svg';
  ancho?: number;
  alto?: number;
}

const MIME_POR_FORMATO: Record<ImagenValidada['formato'], string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  // Revisión Fase 7d: el GIF ya se admitía antes de validar por contenido; se
  // conserva (sharp lo identifica; no genera variantes, como hasta ahora).
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

const PATRONES_SVG_PROHIBIDOS: RegExp[] = [
  /<\s*script/i,
  /\bon[a-z]+\s*=/i,
  /javascript\s*:/i,
  /<\s*foreignObject/i,
  /<!ENTITY/i,
  /xlink:href\s*=\s*["']\s*data:/i,
  /href\s*=\s*["']\s*(?:https?:)?\/\//i,
];

/** Quita BOM, espacios, prologo `<?xml ...?>`, DOCTYPE simple y comentarios iniciales. */
function inicioDeSvg(texto: string): string {
  let t = texto.replace(/^﻿/, '');
  for (;;) {
    const antes = t;
    t = t
      .replace(/^\s+/, '')
      .replace(/^<\?xml[^>]*\?>/i, '')
      .replace(/^<!--[\s\S]*?-->/, '');
    if (t === antes) return t;
  }
}

/** `true` si el contenido es un SVG limpio (sin contenido activo). */
export function esSvgSeguro(buffer: Buffer): boolean {
  const texto = buffer.toString('utf8');
  if (!/^<svg[\s>/]/i.test(inicioDeSvg(texto))) return false;
  return !PATRONES_SVG_PROHIBIDOS.some((re) => re.test(texto));
}

/**
 * Determina el tipo por contenido. Devuelve `null` si no es una imagen
 * admitida (o si es un SVG con contenido activo).
 */
export async function validarImagen(
  buffer: Buffer,
): Promise<ImagenValidada | null> {
  if (!buffer || buffer.length === 0) return null;

  try {
    const meta = await sharp(buffer).metadata();
    let formato: string | undefined = meta.format;
    if (formato === 'heif' && meta.compression === 'av1') formato = 'avif';
    if (
      formato === 'png' ||
      formato === 'jpeg' ||
      formato === 'webp' ||
      formato === 'avif' ||
      formato === 'gif'
    ) {
      if (!meta.width || !meta.height) return null;
      return {
        mime: MIME_POR_FORMATO[formato],
        formato,
        ancho: meta.width,
        alto: meta.height,
      };
    }
    // Otro formato raster (gif, tiff, ...) o SVG que sharp sabe leer: se decide abajo.
  } catch {
    // No es raster: puede ser SVG.
  }

  if (esSvgSeguro(buffer)) {
    return { mime: MIME_POR_FORMATO.svg, formato: 'svg' };
  }
  return null;
}
