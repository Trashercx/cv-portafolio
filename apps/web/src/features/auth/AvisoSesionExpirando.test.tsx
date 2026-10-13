import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth-store'
import { AvisoSesionExpirando } from './AvisoSesionExpirando'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    )
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

// Mismo patrón que `ProyectoFormDialog.test.tsx`: se mockea el hook de
// mutación (no `apiFetch`), y el mock de `mutate` reproduce a mano el
// `onSuccess` real (actualizar el auth store con el nuevo `expiresAt`) para
// poder comprobar que el aviso desaparece solo, sin depender de una red real.
//
// Se usa `fireEvent` (no `userEvent`) para los clicks: `userEvent` agrega
// esperas internas basadas en timers reales que no combinan bien con
// `vi.useFakeTimers()` (necesario acá para controlar `Date.now()` contra
// `admin.expiresAt`).
const refrescarMutateMock = vi.fn()
const refrescarState: { isPending: boolean } = { isPending: false }

vi.mock('./useRefrescarSesion', () => ({
  useRefrescarSesion: () => ({
    mutate: refrescarMutateMock,
    isPending: refrescarState.isPending,
  }),
}))

function renderAviso() {
  return render(
    <MemoryRouter>
      <AvisoSesionExpirando />
    </MemoryRouter>,
  )
}

describe('AvisoSesionExpirando', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    useAuthStore.setState({ admin: null, isAuthenticated: false })
  })

  afterEach(() => {
    vi.clearAllMocks()
    refrescarState.isPending = false
    useAuthStore.setState({ admin: null, isAuthenticated: false })
    vi.useRealTimers()
  })

  it('no muestra nada mientras falten más de 60s para expirar', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 90_000).toISOString(),
      },
      isAuthenticated: true,
    })

    renderAviso()

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('muestra el aviso a los 60s o menos y "Seguir conectado" dispara el refresh', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
      },
      isAuthenticated: true,
    })

    renderAviso()

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(
      screen.getByText(/tu sesión está por expirar/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /seguir conectado/i }))

    expect(refrescarMutateMock).toHaveBeenCalledTimes(1)
  })

  it('el aviso desaparece solo cuando el refresh actualiza expiresAt en el store', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
      },
      isAuthenticated: true,
    })
    refrescarMutateMock.mockImplementation(() => {
      useAuthStore.getState().setAdmin({
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      })
    })

    renderAviso()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /seguir conectado/i }))

    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('deshabilita "Seguir conectado" mientras el refresh está en curso', () => {
    refrescarState.isPending = true
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
      },
      isAuthenticated: true,
    })

    renderAviso()

    expect(
      screen.getByRole('button', { name: /renovando/i }),
    ).toBeDisabled()
  })

  it('"Cancelar" limpia el store y navega al login', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
      },
      isAuthenticated: true,
    })

    renderAviso()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(useAuthStore.getState().admin).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(navigateMock).toHaveBeenCalledWith('/admin/login', { replace: true })
  })

  it('muestra el contador m:ss y baja al avanzar el tiempo', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
      },
      isAuthenticated: true,
    })

    renderAviso()
    expect(screen.getByRole('timer')).toHaveTextContent('0:45')

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(screen.getByRole('timer')).toHaveTextContent('0:40')
  })

  it('al llegar a 0 cierra la sesión sola y navega al login con sesion=expirada', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 3_000).toISOString(),
      },
      isAuthenticated: true,
    })

    renderAviso()
    expect(navigateMock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(useAuthStore.getState().admin).toBeNull()
    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/admin/login?sesion=expirada', {
      replace: true,
    })
  })
})
