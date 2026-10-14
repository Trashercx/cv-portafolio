import { describe, expect, it } from 'vitest'
import { ALTO_VIEWBOX, ANCHO_PERIODO, construirCaminoOnda } from './camino-onda'

describe('construirCaminoOnda (Fase 7b, UC-15)', () => {
  it('cubre dos periodos y se cierra por abajo para rellenar', () => {
    const d = construirCaminoOnda(3, 20)
    expect(d.startsWith('M0 ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d).toContain(`L${ANCHO_PERIODO * 2} ${ALTO_VIEWBOX}`)
    // 3 ciclos = 6 tramos por periodo, 12 en dos periodos.
    expect(d.match(/Q/g)).toHaveLength(12)
  })

  it('la mitad izquierda y la derecha son idénticas salvo el desplazamiento (bucle sin salto)', () => {
    const d = construirCaminoOnda(2, 30)
    const curvas = [...d.matchAll(/Q([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)/g)].map((m) =>
      m.slice(1).map(Number),
    )
    const mitad = curvas.length / 2
    for (let i = 0; i < mitad; i++) {
      const [cx, cy, x, y] = curvas[i]
      const [cx2, cy2, x2, y2] = curvas[i + mitad]
      expect(cx2).toBeCloseTo(cx + ANCHO_PERIODO, 0)
      expect(x2).toBeCloseTo(x + ANCHO_PERIODO, 0)
      expect(cy2).toBe(cy)
      expect(y2).toBe(y)
    }
  })
})
