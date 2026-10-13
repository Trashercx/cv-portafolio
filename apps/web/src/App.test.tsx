import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@/features/publico/usePublico', () => ({
  useSitio: () => ({ data: null, isLoading: false, error: null }),
}))

describe('App — rutas desconocidas (Fase 6)', () => {
  it('una ruta pública inexistente muestra la 404 en vez de redirigir a /', async () => {
    render(
      <MemoryRouter initialEntries={['/esta-ruta-no-existe']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
  })
})
