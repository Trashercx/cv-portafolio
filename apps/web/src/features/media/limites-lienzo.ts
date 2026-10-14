/**
 * Fase 7g, UC-09: topes del lienzo compartidos por la conversión de PDF a PNG
 * (`features/insignias/pdf-a-imagen.ts`, Fase 7e) y la de HEIC a JPEG
 * (`heic-a-jpeg.ts`): un archivo enorme no debe agotar la memoria del navegador.
 */
export const LADO_MAXIMO_PX = 4000
export const AREA_MAXIMA_PX = 16_000_000

/** Límite del API por archivo (10 MB). */
export const MAX_BYTES_SUBIDA = 10 * 1024 * 1024
