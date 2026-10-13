import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ToggleModoTema } from './ToggleModoTema'

/**
 * Séptima ronda: la etiqueta visible sobre el botón (reemplazo del `title`
 * nativo) debe existir en el DOM y cambiar de texto al alternar el modo.
 * El modo se fuerza con el override de `localStorage` que lee `useModoTema`.
 */
describe('ToggleModoTema', () => {
  beforeEach(() => {
    window.localStorage.setItem('sitio-publico-modo-tema', 'claro')
  })

  afterEach(() => {
    window.localStorage.removeItem('sitio-publico-modo-tema')
  })

  it('muestra la etiqueta "Cambiar a modo oscuro" estando en modo claro', () => {
    render(<ToggleModoTema />)

    const boton = screen.getByRole('button', { name: 'Cambiar a modo oscuro' })
    expect(boton).not.toHaveAttribute('title')
    const etiqueta = screen.getByText('Cambiar a modo oscuro', {
      selector: 'span',
    })
    expect(etiqueta).toHaveAttribute('aria-hidden', 'true')
  })

  it('la etiqueta cambia a "Cambiar a modo claro" al hacer click', () => {
    render(<ToggleModoTema />)

    fireEvent.click(screen.getByRole('button'))

    expect(
      screen.getByRole('button', { name: 'Cambiar a modo claro' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Cambiar a modo claro', { selector: 'span' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Cambiar a modo oscuro', { selector: 'span' }),
    ).not.toBeInTheDocument()
  })
})
