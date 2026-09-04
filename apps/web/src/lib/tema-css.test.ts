import type { CSSProperties } from 'react'
import { describe, expect, it } from 'vitest'
import { temaComoVariablesCss } from './tema-css'

/** Las 4 variables custom no están tipadas en `CSSProperties`: se leen vía un cast local para los tests. */
function variablesCss(style: CSSProperties) {
  return style as unknown as Record<string, string>
}

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

/**
 * Fase 4.6 (UC-08/UC-12): `modo` (2do argumento, opt-in, default `'claro'`)
 * decide si se aplican los colores del `Tema` tal cual o la paleta derivada
 * (`derivarPaletaOscura`, `lib/tema-oscuro.ts`).
 */
describe('temaComoVariablesCss — modo', () => {
  const baseTema = {
    color_primario: '#2563eb',
    color_secundario: '#7c3aed',
    color_fondo: '#ffffff',
    color_texto: '#0f172a',
    fuente_principal: 'manrope',
  }

  it('sin segundo argumento, usa los colores del tema tal cual (modo claro por default)', () => {
    const resultado = variablesCss(temaComoVariablesCss(baseTema))

    expect(resultado['--color-fondo']).toBe('#ffffff')
    expect(resultado['--color-texto']).toBe('#0f172a')
    expect(resultado['--color-primario']).toBe('#2563eb')
    expect(resultado['--color-secundario']).toBe('#7c3aed')
  })

  it("modo='claro' explícito usa los colores del tema tal cual", () => {
    const resultado = variablesCss(temaComoVariablesCss(baseTema, 'claro'))

    expect(resultado['--color-fondo']).toBe('#ffffff')
    expect(resultado['--color-texto']).toBe('#0f172a')
  })

  it("modo='oscuro' aplica la paleta derivada (luminosidad invertida), no los colores originales", () => {
    const resultado = variablesCss(temaComoVariablesCss(baseTema, 'oscuro'))

    expect(resultado['--color-fondo']).not.toBe('#ffffff')
    expect(resultado['--color-texto']).not.toBe('#0f172a')
    // Blanco puro invertido con clamp da un gris casi negro (ver
    // `tema-oscuro.test.ts` para el detalle de la derivación).
    expect(String(resultado['--color-fondo']).toLowerCase()).toBe('#0f0f0f')
  })

  it("modo='oscuro' no afecta fontFamily: la tipografía es igual en ambos modos", () => {
    const claro = temaComoVariablesCss(baseTema, 'claro')
    const oscuro = temaComoVariablesCss(baseTema, 'oscuro')

    expect(oscuro.fontFamily).toBe(claro.fontFamily)
  })
})

/**
 * Fase 4.7 (fix de convergencia visual del sitio público): las 11 superficies
 * genéricas de shadcn/Tailwind (`derivarSuperficiesShadcn`, `tema-superficies.ts`)
 * se incluyen como variables CSS junto a las 4 de negocio, para que
 * componentes que usan clases como `bg-card`/`text-muted-foreground` también
 * se pinten según el `Tema` activo en vez de los valores fijos de `index.css`.
 */
describe('temaComoVariablesCss — superficies shadcn', () => {
  const baseTema = {
    color_primario: '#2563eb',
    color_secundario: '#7c3aed',
    color_fondo: '#ffffff',
    color_texto: '#0f172a',
    fuente_principal: 'manrope',
  }

  it('incluye --background/--foreground iguales a los tokens de negocio de fondo/texto', () => {
    const resultado = variablesCss(temaComoVariablesCss(baseTema))

    expect(resultado['--background']).toBe(resultado['--color-fondo'])
    expect(resultado['--foreground']).toBe(resultado['--color-texto'])
  })

  it('incluye las 11 variables de superficie genéricas de shadcn', () => {
    const resultado = variablesCss(temaComoVariablesCss(baseTema))

    for (const variable of [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--muted',
      '--muted-foreground',
      '--border',
      '--accent',
      '--accent-foreground',
    ]) {
      expect(resultado[variable]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it("modo='oscuro' deriva --background/--card/--muted/--border de la paleta oscura, distintos del modo claro", () => {
    const claro = variablesCss(temaComoVariablesCss(baseTema, 'claro'))
    const oscuro = variablesCss(temaComoVariablesCss(baseTema, 'oscuro'))

    expect(oscuro['--background']).not.toBe(claro['--background'])
    expect(oscuro['--card']).not.toBe(claro['--card'])
    expect(oscuro['--muted']).not.toBe(claro['--muted'])
    expect(oscuro['--border']).not.toBe(claro['--border'])
  })
})
