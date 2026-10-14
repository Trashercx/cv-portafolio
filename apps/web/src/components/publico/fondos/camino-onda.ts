export const ANCHO_PERIODO = 1440
export const ALTO_VIEWBOX = 400
const LINEA_MEDIA = 130

/**
 * Camino SVG de una onda que se repite exactamente cada `ANCHO_PERIODO`
 * unidades y se dibuja dos veces seguidas: al trasladar el `<svg>` (200 % de
 * ancho) un 50 % el bucle no tiene salto. Cada medio ciclo es una curva
 * cuadrática (el punto de control a `2 * amplitud` da un pico de `amplitud`).
 */
export function construirCaminoOnda(ciclos: number, amplitud: number): string {
  const tramo = ANCHO_PERIODO / (ciclos * 2)
  const tramos = ciclos * 2 * 2
  let d = `M0 ${LINEA_MEDIA}`
  for (let i = 0; i < tramos; i++) {
    const x = (i + 1) * tramo
    const controlY = LINEA_MEDIA + (i % 2 === 0 ? -2 : 2) * amplitud
    d += ` Q${(x - tramo / 2).toFixed(1)} ${controlY.toFixed(1)} ${x.toFixed(1)} ${LINEA_MEDIA}`
  }
  return `${d} L${ANCHO_PERIODO * 2} ${ALTO_VIEWBOX} L0 ${ALTO_VIEWBOX} Z`
}
