import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { RequireAuth } from './RequireAuth'

const apiFetchMock = vi.fn()

vi.mock('@/lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-client')>()),
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

const ADMIN = {
  email: 'admin@example.com',
  nombre: 'Admin',
  expiresAt: '2099-01-01T00:00:00.000Z',
}

function renderRuta() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/login" element={<p>Pantalla de login</p>} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <p>Ruta protegida</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Rehidratación de la sesión al recargar (octava ronda, UC-01). */
describe('RequireAuth — rehidratación con GET /auth/sesion', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    useAuthStore.setState({ admin: null, isAuthenticated: false })
  })

  it('con cookie válida (200) muestra la carga y luego renderiza la ruta protegida sin pasar por el login', async () => {
    apiFetchMock.mockResolvedValue(ADMIN)
    renderRuta()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Ruta protegida')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/sesion')
    expect(useAuthStore.getState().admin).toEqual(ADMIN)
  })

  it('sin sesión (401) redirige al login', async () => {
    apiFetchMock.mockRejectedValue(new ApiError('No autorizado', 401, '/auth/sesion'))
    renderRuta()

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
    expect(screen.queryByText('Ruta protegida')).not.toBeInTheDocument()
  })

  it('no llama a /auth/sesion si el store ya tiene admin', () => {
    useAuthStore.getState().setAdmin(ADMIN)
    renderRuta()

    expect(screen.getByText('Ruta protegida')).toBeInTheDocument()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})
