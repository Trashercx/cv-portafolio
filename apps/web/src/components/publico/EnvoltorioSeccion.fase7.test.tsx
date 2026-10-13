import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { simularMovimientoReducido } from '@/test/movimiento'
import { ProveedorModoRenderizado } from './contexto-renderizado'
import { EnvoltorioSeccion } from './EnvoltorioSeccion'

/**
 * Fase 7 (7.3, UC-12): ancla `#seccion-{id}`, `separador_forma`, fondos
 * `degradado`/`vidrio` y `animacion_entrada` (apagada en el lienzo y con
 * movimiento reducido). Los tests de la Fase 3.4 viven en
 * `EnvoltorioSeccion.test.tsx`.
 */
describe('EnvoltorioSeccion (Fase 7)', () => {
  it('pone id="seccion-{id}" y scroll-mt-24 para el salto desde la navegación', () => {
    render(
      <EnvoltorioSeccion visible id="abc">
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    const section = document.getElementById('seccion-abc') as HTMLElement
    expect(section).toHaveClass('scroll-mt-24')
  })

  it('sin id (bloque aún sin guardar) no pone atributo id', () => {
    const { container } = render(
      <EnvoltorioSeccion visible>
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    expect(container.querySelector('section')).not.toHaveAttribute('id')
  })

  it.each(['onda', 'diagonal', 'curva'] as const)(
    'separador_forma="%s" dibuja un SVG al pie y quita el borde recto',
    (forma) => {
      const { container } = render(
        <EnvoltorioSeccion visible id="s" separador_forma={forma}>
          <p>Contenido</p>
        </EnvoltorioSeccion>,
      )

      const svg = container.querySelector(`svg[data-separador="${forma}"]`)
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(container.querySelector('path')).toHaveClass('fill-[var(--color-primario)]/15')
      expect(document.getElementById('seccion-s')).not.toHaveClass('border-b')
    },
  )

  it('separador_forma="ninguno" (default) no dibuja SVG y conserva el borde', () => {
    const { container } = render(
      <EnvoltorioSeccion visible id="s">
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    expect(container.querySelector('svg')).not.toBeInTheDocument()
    expect(document.getElementById('seccion-s')).toHaveClass('border-b')
  })

  it('fondo_bloque="degradado" usa el degradado primario → secundario al 12 %', () => {
    render(
      <EnvoltorioSeccion visible id="g" fondo_bloque="degradado">
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    expect(document.getElementById('seccion-g')).toHaveClass(
      'bg-linear-to-br',
      'from-[var(--color-primario)]/12',
      'to-[var(--color-secundario)]/12',
    )
  })

  it('fondo_bloque="vidrio" usa tarjeta translúcida con desenfoque', () => {
    render(
      <EnvoltorioSeccion visible id="v" fondo_bloque="vidrio">
        <p>Contenido</p>
      </EnvoltorioSeccion>,
    )

    expect(document.getElementById('seccion-v')).toHaveClass(
      'bg-card/60',
      'backdrop-blur',
      'border-border/50',
      'rounded-2xl',
    )
  })

  describe('animacion_entrada', () => {
    it('en el sitio público arranca transparente (default "aparecer")', () => {
      simularMovimientoReducido(false)
      render(
        <EnvoltorioSeccion visible id="a">
          <p>Contenido</p>
        </EnvoltorioSeccion>,
      )

      expect(document.getElementById('seccion-a')?.style.opacity).toBe('0')
    })

    it('"ninguna" no oculta la sección al inicio', () => {
      simularMovimientoReducido(false)
      render(
        <EnvoltorioSeccion visible id="a" animacion_entrada="ninguna">
          <p>Contenido</p>
        </EnvoltorioSeccion>,
      )

      expect(document.getElementById('seccion-a')?.style.opacity).toBe('')
    })

    it('con prefers-reduced-motion no anima', () => {
      simularMovimientoReducido(true)
      render(
        <EnvoltorioSeccion visible id="a" animacion_entrada="escalar">
          <p>Contenido</p>
        </EnvoltorioSeccion>,
      )

      expect(document.getElementById('seccion-a')?.style.opacity).toBe('')
    })

    it('dentro del lienzo del editor no anima', () => {
      simularMovimientoReducido(false)
      render(
        <ProveedorModoRenderizado modo="editor">
          <EnvoltorioSeccion visible id="a" animacion_entrada="deslizar_arriba">
            <p>Contenido</p>
          </EnvoltorioSeccion>
        </ProveedorModoRenderizado>,
      )

      expect(document.getElementById('seccion-a')?.style.opacity).toBe('')
    })

    it('una sección oculta no anima (conserva su opacity-40)', () => {
      simularMovimientoReducido(false)
      render(
        <EnvoltorioSeccion visible={false} id="a">
          <p>Contenido</p>
        </EnvoltorioSeccion>,
      )

      const section = document.getElementById('seccion-a') as HTMLElement
      expect(section.style.opacity).toBe('')
      expect(section).toHaveClass('opacity-40')
    })
  })
})
