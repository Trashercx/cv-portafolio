import { describe, expect, it } from 'vitest'
import { temaComoVariablesCss } from './tema-css'

/**
 * Fase 3.4 (UC-08): `fuente_principal` pasó de texto libre a 4 tokens
 * nuevos (ver `features/tema/tema-schema.ts`) que deben resolver a un stack
 * de `font-family` real. Los valores legados (temas ya guardados con
 * 'Inter'/'Poppins'/'Merriweather'/'Georgia') deben seguir funcionando sin
 * cambios (passthrough), para no romper la lectura de temas existentes.
 */
describe('temaComoVariablesCss', () => {
  const baseTema = {
    color_primario: '#2563eb',
    color_secundario: '#7c3aed',
    color_fondo: '#ffffff',
    color_texto: '#0f172a',
  }

  it('resuelve el token nuevo "manrope" a un stack real que incluye la webfont cargada', () => {
    const resultado = temaComoVariablesCss({
      ...baseTema,
      fuente_principal: 'manrope',
    })

    expect(resultado.fontFamily).toContain('Manrope Variable')
  })

  it('resuelve "sans_sistema" a un stack de fuentes del sistema', () => {
    const resultado = temaComoVariablesCss({
      ...baseTema,
      fuente_principal: 'sans_sistema',
    })

    expect(resultado.fontFamily).toBe(
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    )
  })

  it('resuelve "serif_sistema" a un stack serif del sistema', () => {
    const resultado = temaComoVariablesCss({
      ...baseTema,
      fuente_principal: 'serif_sistema',
    })

    expect(resultado.fontFamily).toBe(
      "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
    )
  })

  it('resuelve "mono_sistema" a un stack monoespaciado del sistema', () => {
    const resultado = temaComoVariablesCss({
      ...baseTema,
      fuente_principal: 'mono_sistema',
    })

    expect(resultado.fontFamily).toBe(
      "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
    )
  })

  it('deja pasar un valor legado ("Inter") sin traducirlo, para no romper temas ya guardados', () => {
    const resultado = temaComoVariablesCss({
      ...baseTema,
      fuente_principal: 'Inter',
    })

    expect(resultado.fontFamily).toBe('Inter')
  })
})
