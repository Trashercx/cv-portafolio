import { describe, expect, it } from 'vitest'
import {
  esHexValido,
  luminanciaRelativa,
  nivelContraste,
  ratioContraste,
} from './contraste'

describe('luminanciaRelativa', () => {
  it('negro es 0 y blanco es 1', () => {
    expect(luminanciaRelativa('#000000')).toBe(0)
    expect(luminanciaRelativa('#ffffff')).toBeCloseTo(1, 10)
  })

  it('acepta la forma corta #rgb', () => {
    expect(luminanciaRelativa('#fff')).toBeCloseTo(1, 10)
    expect(luminanciaRelativa('#f00')).toBeCloseTo(luminanciaRelativa('#ff0000'), 10)
  })

  it('el rojo puro pesa 0.2126 (coeficiente WCAG)', () => {
    expect(luminanciaRelativa('#ff0000')).toBeCloseTo(0.2126, 4)
  })
})

describe('ratioContraste (WCAG 2.x)', () => {
  it('negro sobre blanco es 21:1', () => {
    expect(ratioContraste('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('un color contra sí mismo es 1:1', () => {
    expect(ratioContraste('#2563eb', '#2563eb')).toBeCloseTo(1, 10)
  })

  it('es simétrico', () => {
    expect(ratioContraste('#123456', '#fedcba')).toBeCloseTo(
      ratioContraste('#fedcba', '#123456'),
      10,
    )
  })

  it('reproduce el valor de referencia de #777777 sobre blanco (4.48:1, no llega a AA)', () => {
    const ratio = ratioContraste('#777777', '#ffffff')
    expect(ratio).toBeCloseTo(4.48, 2)
    expect(nivelContraste(ratio)).toBe('insuficiente')
  })

  it('reproduce el valor de referencia de #767676 sobre blanco (4.54:1, justo AA)', () => {
    const ratio = ratioContraste('#767676', '#ffffff')
    expect(ratio).toBeCloseTo(4.54, 2)
    expect(nivelContraste(ratio)).toBe('AA')
  })

  it('lanza RangeError con un color inválido', () => {
    expect(() => ratioContraste('azul', '#ffffff')).toThrow(RangeError)
    expect(() => ratioContraste('#12345', '#ffffff')).toThrow(RangeError)
  })
})

describe('nivelContraste', () => {
  it('clasifica por umbrales AAA >= 7, AA >= 4.5', () => {
    expect(nivelContraste(21)).toBe('AAA')
    expect(nivelContraste(7)).toBe('AAA')
    expect(nivelContraste(6.99)).toBe('AA')
    expect(nivelContraste(4.5)).toBe('AA')
    expect(nivelContraste(4.49)).toBe('insuficiente')
    expect(nivelContraste(1)).toBe('insuficiente')
  })
})

describe('esHexValido', () => {
  it('acepta #rgb y #rrggbb y rechaza el resto', () => {
    expect(esHexValido('#fff')).toBe(true)
    expect(esHexValido('#A1b2C3')).toBe(true)
    expect(esHexValido('fff')).toBe(false)
    expect(esHexValido('#ffff')).toBe(false)
    expect(esHexValido('#gggggg')).toBe(false)
    expect(esHexValido('')).toBe(false)
  })
})
