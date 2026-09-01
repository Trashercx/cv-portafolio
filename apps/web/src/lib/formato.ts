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
