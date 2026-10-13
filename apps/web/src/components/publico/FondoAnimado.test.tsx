import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FondoAnimado } from './FondoAnimado'

/**
 * Fase 7 (7.3, UC-15): el fondo animado se congela en el primer frame con
 * `prefers-reduced-motion`. La pausa la hace una regla de `index.css` sobre
 * `.fondo-animado` (la `animation` va inline, así que hace falta
 * `!important`); jsdom no evalúa media queries, por eso se comprueba la clase
 * del componente y el texto de la regla.
 */
describe('FondoAnimado — movimiento reducido', () => {
  it('marca el contenedor con la clase .fondo-animado', () => {
    const { container } = render(
      <FondoAnimado fondo={{ tipo: 'aurora_animada', configuracion: { velocidad: 'media', opacidad: 0.5 } }} />,
    )
    expect(container.firstElementChild).toHaveClass('fondo-animado')
  })

  it('index.css pausa las animaciones de .fondo-animado bajo prefers-reduced-motion', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf-8')
    const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .hero-blob'))
    expect(bloque).toContain('.fondo-animado *')
    expect(bloque).toMatch(/animation-play-state:\s*paused\s*!important/)
  })
})
