import type { Media, UsoMedia } from './types'

/** Clave anterior a la Fase 7h: `<carpeta>/<uuid>.<ext>` (nombre aleatorio). */
const NOMBRE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.\w+)?$/i

/**
 * Nombre de archivo: último segmento de `s3_key` (Fase 7d, UC-09). Desde la
 * Fase 7h la clave termina en el nombre original saneado
 * (`<carpeta>/<id>/<nombre>.<ext>`). Los archivos subidos antes conservan su
 * nombre aleatorio en S3: para ellos se muestra el texto alternativo si existe.
 */
export function nombreArchivo(media: Pick<Media, 's3_key'> & { alt_text?: string | null }): string {
  const segmento = media.s3_key.split('/').pop() || media.s3_key
  let nombre = segmento
  try {
    nombre = decodeURIComponent(segmento)
  } catch {
    // Secuencia % inválida: se muestra tal cual.
  }
  if (NOMBRE_UUID.test(nombre) && media.alt_text?.trim()) return media.alt_text.trim()
  return nombre
}

/** Etiqueta legible de un uso, para el tooltip y el detalle (Fase 7d, UC-09). */
export function textoUso(uso: UsoMedia): string {
  return `${uso.tipo}: ${uso.nombre}`
}
