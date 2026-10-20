/**
 * Formatea una fecha `YYYY-MM-DD` (tal como llegan `fecha_inicio`,
 * `fecha_emision`, etc. desde el backend) a un texto legible en español,
 * usado en el sitio público (UC-12/UC-13). Devuelve `null` si `fecha` es
 * `null`/`undefined` para que el llamador decida el texto de reemplazo.
 */
export function formatearFecha(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  const valor = new Date(fecha)
  if (Number.isNaN(valor.getTime())) return fecha
  return valor.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Fase 7m (#68), UC-09: tamaño de archivo legible en español ("1,2 MB",
 * "840 KB"). Devuelve `null` si no hay dato (archivos anteriores a
 * `Media.bytes`) para que el llamador lo omita.
 */
export function formatearBytes(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null
  if (bytes < 1024) return `${bytes} B`
  const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
  if (bytes < 1024 * 1024) return `${formato.format(Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${formato.format(bytes / (1024 * 1024))} MB`
  return `${formato.format(bytes / (1024 * 1024 * 1024))} GB`
}
