import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { INCLINACION_MAXIMA_GRADOS } from '@/lib/efectos-hover'
import { simularMovimientoReducido } from '@/test/movimiento'
import { ProveedorModoRenderizado } from './contexto-renderizado'
import { TarjetaInteractiva } from './TarjetaInteractiva'

/**
 * Fase 7 (7.3, UC-12): `elevar` e `inclinar` (tilt 3D de máx. 6°); el hover
 * sigue activo en el lienzo del editor y se degrada con movimiento reducido.
 */
describe('TarjetaInteractiva', () => {
  it('elevar sube 4 px y proyecta sombra grande', () => {
    render(
      <TarjetaInteractiva efecto="elevar">
        <p>Tarjeta</p>
      </TarjetaInteractiva>,
    )
    expect(screen.getByText('Tarjeta').parentElement).toHaveClass(
      'hover:-translate-y-1',
      'hover:shadow-xl',
    )
  })

  it('sin efecto usa elevar (default del API)', () => {
    render(
      <TarjetaInteractiva>
        <p>Tarjeta</p>
      </TarjetaInteractiva>,
    )
    expect(screen.getByText('Tarjeta').parentElement).toHaveAttribute('data-efecto-hover', 'elevar')
  })

  it('ninguno no añade clases de hover', () => {
    render(
      <TarjetaInteractiva efecto="ninguno" className="extra">
        <p>Tarjeta</p>
      </TarjetaInteractiva>,
    )
    const contenedor = screen.getByText('Tarjeta').parentElement
    expect(contenedor).toHaveClass('extra')
    expect(contenedor).not.toHaveClass('hover:-translate-y-1')
  })

  it('inclinar gira hacia el cursor y vuelve a 0° al salir, sin pasar de 6°', async () => {
    simularMovimientoReducido(false)
    render(
      <TarjetaInteractiva efecto="inclinar">
        <p>Tarjeta</p>
      </TarjetaInteractiva>,
    )
    const contenedor = screen.getByText('Tarjeta').parentElement as HTMLElement
    contenedor.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }) as DOMRect

    fireEvent.pointerMove(contenedor, { clientX: 100, clientY: 50, pointerType: 'mouse' })
    // El spring aplica el giro en el siguiente frame de animación.
    await waitFor(() => expect(contenedor.style.transform).toMatch(/rotateY\(/))
    // El ángulo nunca supera el máximo.
    const angulo = Number(/rotateY\((-?[\d.]+)deg\)/.exec(contenedor.style.transform)?.[1] ?? 0)
    expect(Math.abs(angulo)).toBeLessThanOrEqual(INCLINACION_MAXIMA_GRADOS)
    fireEvent.pointerLeave(contenedor)
    expect(contenedor).toHaveAttribute('data-efecto-hover', 'inclinar')
  })

  it('inclinar se ignora con puntero táctil', () => {
    simularMovimientoReducido(false)
    render(
      <TarjetaInteractiva efecto="inclinar">
        <p>Tarjeta</p>
      </TarjetaInteractiva>,
    )
    const contenedor = screen.getByText('Tarjeta').parentElement as HTMLElement
    contenedor.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }) as DOMRect
    const antes = contenedor.style.transform
    fireEvent.pointerMove(contenedor, { clientX: 100, clientY: 0, pointerType: 'touch' })
    expect(contenedor.style.transform).toBe(antes)
  })

  it('con prefers-reduced-motion inclinar queda en solo sombra, sin tilt', () => {
    simularMovimientoReducido(true)
    render(
      <TarjetaInteractiva efecto="inclinar">
        <p>Tarjeta</p>
      </TarjetaInteractiva>,
    )
    const contenedor = screen.getByText('Tarjeta').parentElement as HTMLElement
    expect(contenedor).toHaveClass('hover:shadow-xl')
    fireEvent.pointerMove(contenedor, { clientX: 100, clientY: 0, pointerType: 'mouse' })
    expect(contenedor.style.transform).not.toMatch(/rotate/)
  })

  it('en el lienzo del editor el hover sigue activo', () => {
    render(
      <ProveedorModoRenderizado modo="editor">
        <TarjetaInteractiva efecto="elevar">
          <p>Tarjeta</p>
        </TarjetaInteractiva>
      </ProveedorModoRenderizado>,
    )
    expect(screen.getByText('Tarjeta').parentElement).toHaveClass('hover:-translate-y-1')
  })
})
