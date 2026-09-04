import { describe, expect, it } from 'vitest'
import { derivarPaletaOscura } from './tema-oscuro'

/**
 * Fase 4.6 (UC-08/UC-12): `derivarPaletaOscura` invierte la luminosidad
 * (`L' = 100 - L`, clamp [6, 94]) de cada color de un `Tema`, preservando
 * hue/saturación, sin tocar `fuente_principal`.
 */
describe('derivarPaletaOscura', () => {
  const baseTema = {
    color_primario: '#2563eb',
    color_secundario: '#7c3aed',
    color_fondo: '#ffffff',
    color_texto: '#0f172a',
    fuente_principal: 'manrope',
  }

  it('un color de fondo muy claro (blanco puro) da un resultado muy oscuro (clamp en el extremo superior)', () => {
    const resultado = derivarPaletaOscura(baseTema)

    // Blanco puro (L=100) invertido daría L=0, clamp lo sube a 6: un gris
    // casi negro, no negro puro.
    expect(resultado.color_fondo.toLowerCase()).toBe('#0f0f0f')
  })

  it('un color de texto muy oscuro da un resultado muy claro (clamp en el extremo inferior)', () => {
    const resultado = derivarPaletaOscura({
      ...baseTema,
      color_texto: '#000000',
    })

    // Negro puro (L=0) invertido daría L=100, clamp lo baja a 94: un gris
    // casi blanco, no blanco puro.
    expect(resultado.color_texto.toLowerCase()).toBe('#f0f0f0')
  })

  it('preserva hue y saturación de un color intermedio, solo invirtiendo la luminosidad', () => {
    // #2563eb -> hsl(~221.2°, ~83.2%, ~53.3%). Invertido: L≈46.7 -> mismo
    // hue/saturación, más oscuro.
    const resultado = derivarPaletaOscura(baseTema)

    expect(resultado.color_primario.toLowerCase()).toBe('#1452da')
  })

  it('copia fuente_principal sin modificarla', () => {
    const resultado = derivarPaletaOscura(baseTema)

    expect(resultado.fuente_principal).toBe('manrope')
  })

  it('es su propia inversa aproximada: aplicar dos veces sobre un color de luminosidad media vuelve muy cerca del original', () => {
    const original = { ...baseTema, color_primario: '#808080' } // gris medio, L=50
    const unaVez = derivarPaletaOscura(original)
    const dosVeces = derivarPaletaOscura({
      ...original,
      color_primario: unaVez.color_primario,
    })

    expect(dosVeces.color_primario.toLowerCase()).toBe('#808080')
  })
})
