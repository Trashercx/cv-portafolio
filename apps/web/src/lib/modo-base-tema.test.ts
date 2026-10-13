import { describe, expect, it } from 'vitest'
import { modoBaseDelTema, paletaEfectiva } from './tema-oscuro'

// Octava ronda (UC-08): `Tema.modo` es el modo base, pero hasta esta ronda era
// metadata inerte, así que un tema guardado puede declarar un modo que
// contradiga sus colores. Manda la luminosidad del fondo.
const base = { color_primario: '#3b82f6', color_secundario: '#9333ea', fuente_principal: 'manrope' }

describe('modoBaseDelTema', () => {
  it('un fondo oscuro es base oscura aunque el tema no declare modo', () => {
    expect(modoBaseDelTema({ ...base, color_fondo: '#18181b', color_texto: '#fafafa' })).toBe('oscuro')
  })

  it('un fondo claro con modo declarado oscuro se trata como base clara', () => {
    expect(
      modoBaseDelTema({ ...base, color_fondo: '#ffffff', color_texto: '#111111', modo: 'oscuro' }),
    ).toBe('claro')
  })

  it('un fondo oscuro con modo declarado claro se trata como base oscura', () => {
    expect(
      modoBaseDelTema({ ...base, color_fondo: '#0f172a', color_texto: '#f8fafc', modo: 'claro' }),
    ).toBe('oscuro')
  })
})

describe('paletaEfectiva con modo declarado inconsistente', () => {
  it('no invierte un tema claro mal etiquetado como oscuro para un visitante en claro', () => {
    const tema = { ...base, color_fondo: '#ffffff', color_texto: '#111111', modo: 'oscuro' as const }
    expect(paletaEfectiva(tema, 'claro')).toBe(tema)
    expect(paletaEfectiva(tema, 'oscuro').color_fondo).not.toBe('#ffffff')
  })
})
