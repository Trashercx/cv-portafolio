/**
 * Duración de un puesto (Fase 7l, UC-19). Las fechas llegan como
 * `YYYY-MM-DD` (o ISO completo); solo importan año y mes, y el mes de inicio y
 * el de fin cuentan completos (criterio de LinkedIn): de enero a diciembre del
 * mismo año son 12 meses ("1 año"), y un puesto de un solo mes dura "1 mes".
 */
function mesesAbsolutos(fecha: string): number | null {
  const coincidencia = /^(\d{4})-(\d{2})/.exec(fecha)
  if (!coincidencia) return null
  return Number(coincidencia[1]) * 12 + (Number(coincidencia[2]) - 1)
}

function mesesDeHoy(hoy: Date): number {
  return hoy.getUTCFullYear() * 12 + hoy.getUTCMonth()
}

/** Meses totales entre inicio y fin (inclusive); `null` si falta o es inválida la fecha de inicio. Nunca menor que 1. */
export function mesesDeDuracion(
  fechaInicio: string,
  fechaFin: string | null | undefined,
  hoy: Date = new Date(),
): number | null {
  const inicio = mesesAbsolutos(fechaInicio)
  if (inicio === null) return null
  const fin = fechaFin ? mesesAbsolutos(fechaFin) : mesesDeHoy(hoy)
  if (fin === null) return null
  return Math.max(1, fin - inicio + 1)
}

/** "2 años 3 meses", "8 meses", "1 año", "1 mes". */
export function formatearMeses(meses: number): string {
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  const partes: string[] = []
  if (anios > 0) partes.push(anios === 1 ? '1 año' : `${anios} años`)
  if (resto > 0) partes.push(resto === 1 ? '1 mes' : `${resto} meses`)
  return partes.join(' ')
}

/**
 * Texto de duración de un puesto: "2 años 3 meses" o, si sigue vigente
 * (`fechaFin` nula), "Actual · 1 año 2 meses". Devuelve `null` si la fecha de
 * inicio no se puede interpretar (el bloque simplemente omite la duración).
 */
export function textoDuracion(
  fechaInicio: string,
  fechaFin: string | null | undefined,
  hoy: Date = new Date(),
): string | null {
  const meses = mesesDeDuracion(fechaInicio, fechaFin, hoy)
  if (meses === null) return null
  const texto = formatearMeses(meses)
  return fechaFin ? texto : `Actual · ${texto}`
}
