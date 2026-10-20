import { describe, expect, it } from 'vitest'
import { formatearMeses, mesesDeDuracion, textoDuracion } from './duracion'

const HOY = new Date('2026-10-20T12:00:00Z')

describe('duracion (Fase 7l, UC-19)', () => {
  it('cuenta inclusivo el mes de inicio y el de fin', () => {
    expect(mesesDeDuracion('2020-01-15', '2020-12-01')).toBe(12)
    expect(mesesDeDuracion('2020-03-01', '2020-03-31')).toBe(1)
  })

  it('nunca baja de un mes aunque las fechas estén invertidas', () => {
    expect(mesesDeDuracion('2021-05-01', '2020-01-01')).toBe(1)
  })

  it('devuelve null si la fecha de inicio es inválida', () => {
    expect(mesesDeDuracion('', null, HOY)).toBeNull()
    expect(textoDuracion('no-fecha', null, HOY)).toBeNull()
  })

  it('formatea años y meses con singular y plural', () => {
    expect(formatearMeses(1)).toBe('1 mes')
    expect(formatearMeses(8)).toBe('8 meses')
    expect(formatearMeses(12)).toBe('1 año')
    expect(formatearMeses(14)).toBe('1 año 2 meses')
    expect(formatearMeses(27)).toBe('2 años 3 meses')
    expect(formatearMeses(25)).toBe('2 años 1 mes')
  })

  it('texto de un puesto cerrado', () => {
    expect(textoDuracion('2020-01-01', '2022-03-31')).toBe('2 años 3 meses')
    expect(textoDuracion('2021-01-10', '2021-08-02')).toBe('8 meses')
  })

  it('un puesto actual lleva el prefijo "Actual" y usa la fecha de hoy', () => {
    expect(textoDuracion('2025-09-01', null, HOY)).toBe('Actual · 1 año 2 meses')
    expect(textoDuracion('2026-10-01', null, HOY)).toBe('Actual · 1 mes')
  })
})
