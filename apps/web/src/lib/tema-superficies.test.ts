import { describe, expect, it } from 'vitest'
import { rgbAHsl, hexARgb, derivarPaletaOscura } from './tema-oscuro'
import { derivarSuperficiesShadcn } from './tema-superficies'

/**
 * Fase 4.7 (fix de convergencia visual del sitio público): las 11
 * superficies genéricas de shadcn/Tailwind se derivan de los 4 tokens de
 * negocio del `Tema`, para que el sitio público tenga una sola fuente de
 * verdad de color.
 */
describe('derivarSuperficiesShadcn', () => {
  const baseTema = {
    color_primario: '#2563eb',
    color_secundario: '#7c3aed',
    color_fondo: '#ffffff',
    color_texto: '#0f172a',
    fuente_principal: 'manrope',
  }

  function hsl(hex: string) {
    const { r, g, b } = hexARgb(hex)
    return rgbAHsl(r, g, b)
  }

  it('modo claro: background/foreground son exactamente color_fondo/color_texto tal cual', () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')

    expect(resultado.background.toLowerCase()).toBe('#ffffff')
    expect(resultado.foreground.toLowerCase()).toBe('#0f172a')
  })

  it('modo oscuro: background/foreground son color_fondo/color_texto ya derivados por derivarPaletaOscura', () => {
    const esperado = derivarPaletaOscura(baseTema)
    const resultado = derivarSuperficiesShadcn(baseTema, 'oscuro')

    expect(resultado.background.toLowerCase()).toBe(esperado.color_fondo.toLowerCase())
    expect(resultado.foreground.toLowerCase()).toBe(esperado.color_texto.toLowerCase())
  })

  it('card/muted/border tienen distinta luminosidad que background pero preservan hue/saturación', () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')
    const hslBackground = hsl(resultado.background)

    for (const clave of ['card', 'muted', 'border'] as const) {
      const hslClave = hsl(resultado[clave])
      expect(hslClave.l).not.toBeCloseTo(hslBackground.l, 1)
      expect(hslClave.h).toBeCloseTo(hslBackground.h, 1)
      expect(hslClave.s).toBeCloseTo(hslBackground.s, 1)
    }
  })

  it("modo='oscuro' aclara card/muted/border respecto a background", () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'oscuro')
    const lBackground = hsl(resultado.background).l

    expect(hsl(resultado.card).l).toBeGreaterThan(lBackground)
    expect(hsl(resultado.muted).l).toBeGreaterThan(lBackground)
    expect(hsl(resultado.border).l).toBeGreaterThan(lBackground)
  })

  it("modo='claro' oscurece card/muted/border respecto a background", () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')
    const lBackground = hsl(resultado.background).l

    expect(hsl(resultado.card).l).toBeLessThan(lBackground)
    expect(hsl(resultado.muted).l).toBeLessThan(lBackground)
    expect(hsl(resultado.border).l).toBeLessThan(lBackground)
  })

  it('cardForeground/popoverForeground/accentForeground son color_texto', () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')

    expect(resultado.cardForeground.toLowerCase()).toBe('#0f172a')
    expect(resultado.popoverForeground.toLowerCase()).toBe('#0f172a')
    expect(resultado.accentForeground.toLowerCase()).toBe('#0f172a')
  })

  it('popover es igual a card', () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')

    expect(resultado.popover).toBe(resultado.card)
  })

  it('mutedForeground es una mezcla entre color_texto y color_fondo (ni uno ni otro puro)', () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')

    expect(resultado.mutedForeground.toLowerCase()).not.toBe('#0f172a')
    expect(resultado.mutedForeground.toLowerCase()).not.toBe('#ffffff')
  })

  it('accent se deriva de color_secundario, no de color_primario ni color_fondo', () => {
    const resultado = derivarSuperficiesShadcn(baseTema, 'claro')
    const hslAccent = hsl(resultado.accent)
    const hslSecundario = hsl(baseTema.color_secundario)

    expect(hslAccent.h).toBeCloseTo(hslSecundario.h, 0)
  })
})
