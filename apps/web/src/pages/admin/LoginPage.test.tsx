import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { LoginPage } from './LoginPage'

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

const mutateMock = vi.fn()
const useLoginState: {
  isPending: boolean
  error: unknown
} = { isPending: false, error: null }

vi.mock('@/features/auth/useLogin', () => ({
  useLogin: () => ({
    mutate: mutateMock,
    isPending: useLoginState.isPending,
    error: useLoginState.error,
  }),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ admin: null, isAuthenticated: false })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useLoginState.isPending = false
    useLoginState.error = null
  })

  it('con la sesión ya rehidratada redirige a /admin en vez de mostrar el formulario (octava ronda, UC-01)', () => {
    useAuthStore
      .getState()
      .setAdmin({ email: 'a@b.com', nombre: 'Admin', expiresAt: '2099-01-01T00:00:00.000Z' })
    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<p>Panel</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Panel')).toBeInTheDocument()
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
  })

  it('no llama a la API cuando el email es inválido', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'no-es-un-email')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('guarda la sesión y navega a /admin cuando el login es exitoso', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_values, { onSuccess }) => {
      onSuccess({ email: 'admin@example.com', nombre: 'Oscar' })
    })

    renderLoginPage()

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
    expect(mutateMock).toHaveBeenCalledWith(
      { email: 'admin@example.com', password: 'password123' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(navigateMock).toHaveBeenCalledWith('/admin', { replace: true })
    expect(useAuthStore.getState().admin).toEqual({
      email: 'admin@example.com',
      nombre: 'Oscar',
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('muestra el mensaje de error de la API cuando el login falla', () => {
    useLoginState.error = new ApiError(
      'Credenciales inválidas o cuenta bloqueada',
      401,
    )

    renderLoginPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      /credenciales inválidas o cuenta bloqueada/i,
    )
  })
})
