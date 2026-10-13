/**
 * Separa el `valor` de una estadística del bloque `sobre-mi` (Fase 7, 7.3,
 * UC-12) en número y sufijo (`"15+"` → 15 y `"+"`; `"98.5%"` → 98.5 con 1
 * decimal y `"%"`). Solo se cuenta si empieza por dígitos; `"24/7"` cuenta 24
 * con sufijo `/7`. Devuelve `null` si no empieza por dígito (`"Top 3"`, `"∞"`):
 * se muestra tal cual, sin contador.
 */
export function analizarValorEstadistica(
  valor: string,
): { numero: number; decimales: number; sufijo: string } | null {
  const coincidencia = /^(\d+)(?:[.,](\d+))?(.*)$/.exec(valor.trim())
  if (!coincidencia) return null
  const [, entero, fraccion = '', sufijo] = coincidencia
  return {
    numero: Number(fraccion ? `${entero}.${fraccion}` : entero),
    decimales: fraccion.length,
    sufijo,
  }
}
