import { describe, expect, it } from 'vitest'
import { analizarValorEstadistica } from './estadisticas'

/** Fase 7 (7.3, UC-12): el contador de estadísticas solo cuenta valores que empiezan por dígitos. */
describe('analizarValorEstadistica', () => {
  it('separa número y sufijo', () => {
    expect(analizarValorEstadistica('15+')).toEqual({ numero: 15, decimales: 0, sufijo: '+' })
    expect(analizarValorEstadistica('98%')).toEqual({ numero: 98, decimales: 0, sufijo: '%' })
    expect(analizarValorEstadistica('120')).toEqual({ numero: 120, decimales: 0, sufijo: '' })
  })

  it('conserva los decimales (punto o coma)', () => {
    expect(analizarValorEstadistica('4.5★')).toEqual({ numero: 4.5, decimales: 1, sufijo: '★' })
    expect(analizarValorEstadistica('4,25')).toEqual({ numero: 4.25, decimales: 2, sufijo: '' })
  })

  it('cuenta solo el primer número de "24/7"', () => {
    expect(analizarValorEstadistica('24/7')).toEqual({ numero: 24, decimales: 0, sufijo: '/7' })
  })

  it('devuelve null si no empieza por dígito', () => {
    expect(analizarValorEstadistica('Top 3')).toBeNull()
    expect(analizarValorEstadistica('∞')).toBeNull()
    expect(analizarValorEstadistica('+10')).toBeNull()
  })
})
