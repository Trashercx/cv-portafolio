import type { Media, UsoMedia } from './types'

/** Nombre de archivo: último segmento de `s3_key` (Fase 7d, UC-09). */
export function nombreArchivo(media: Pick<Media, 's3_key'>): string {
  return media.s3_key.split('/').pop() || media.s3_key
}

/** Etiqueta legible de un uso, para el tooltip y el detalle (Fase 7d, UC-09). */
export function textoUso(uso: UsoMedia): string {
  return `${uso.tipo}: ${uso.nombre}`
}
