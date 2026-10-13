import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ContenidoPrincipal,
  reiniciarSeguimientoDeFoco,
  SaltarAlContenido,
} from './ContenidoPrincipal'
import { LayoutPublico } from './LayoutPublico'

describe('ContenidoPrincipal / SaltarAlContenido (Fase 6, accesibilidad)', () => {
  beforeEach(() => {
    reiniciarSeguimientoDeFoco()
  })

  it('el skip link apunta a <main id="contenido"> y es el primer focusable', async () => {
    render(
      <MemoryRouter>
        <SaltarAlContenido />
        <ContenidoPrincipal>
          <button type="button">Acción</button>
        </ContenidoPrincipal>
      </MemoryRouter>,
    )

    const enlace = screen.getByRole('link', { name: /saltar al contenido/i })
    expect(enlace).toHaveAttribute('href', '#contenido')
    expect(enlace).toHaveClass('sr-only')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')

    await userEvent.tab()
    expect(enlace).toHaveFocus()
  })

  it('no roba el foco en la carga inicial', () => {
    render(
      <MemoryRouter>
        <ContenidoPrincipal>contenido</ContenidoPrincipal>
      </MemoryRouter>,
    )

    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('mueve el foco a <main> al cambiar de ruta pública', async () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route element={<LayoutPublico />}>
            <Route path="/a" element={<Link to="/b">ir a b</Link>} />
            <Route path="/b" element={<p>página b</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('link', { name: 'ir a b' }))

    expect(await screen.findByText('página b')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })
})
