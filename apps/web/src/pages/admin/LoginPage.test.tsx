import { act, render, screen, waitFor } from '@testing-library/react'
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

// Fase 7f, UC-01: snapshot publicado simulado (la pantalla lo usa para la marca).
const sitioState: { data: unknown } = { data: null }

vi.mock('@/features/publico/usePublico', () => ({
  useSitioPublicado: () => ({ data: sitioState.data }),
}))

vi.mock('@/features/auth/useLogin', () => ({
  useLogin: () => ({
    mutate: mutateMock,
    isPending: useLoginState.isPending,
    error: useLoginState.error,
  }),
}))

const SNAPSHOT = {
  perfil: {
    nombre_completo: 'Oscar Burga',
    titulo_profesional: 'Ingeniero de software',
    imagen_perfil: null,
  },
  tema: {
    color_primario: '#112233',
    color_secundario: '#445566',
    color_fondo: '#ffffff',
    color_texto: '#000000',
    fuente_principal: 'Inter',
  },
  fondo: null,
}

function mockMatchMedia(reducido: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reducido && query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function renderLoginPage(ruta = '/admin/login') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <LoginPage />
    </MemoryRouter>,
  )
}

const CAMPO_PASSWORD = /^contraseña/i

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ admin: null, isAuthenticated: false })
    window.localStorage.clear()
    sitioState.data = null
    mockMatchMedia(false)
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
    expect(screen.queryByLabelText(/^email/i)).not.toBeInTheDocument()
  })

  it('sin snapshot muestra "Portafolio" y el enlace al sitio (Fase 7f, UC-01)', () => {
    renderLoginPage()

    expect(screen.getByTestId('panel-marca')).toHaveTextContent('Portafolio')
    expect(screen.getByRole('link', { name: /volver al sitio/i })).toHaveAttribute('href', '/')
    expect(screen.getByText('Panel de administración del portafolio')).toBeInTheDocument()
  })

  it('con snapshot muestra nombre, título e iniciales y aplica el tema (Fase 7f, UC-01)', () => {
    sitioState.data = SNAPSHOT
    renderLoginPage()

    const marca = screen.getByTestId('panel-marca')
    expect(marca).toHaveTextContent('Oscar Burga')
    expect(marca).toHaveTextContent('Ingeniero de software')
    expect(marca.style.getPropertyValue('--color-primario')).toBe('#112233')
    expect(screen.getByText('OB')).toBeInTheDocument()
  })

  it('enfoca el email al montar', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/^email/i)).toHaveFocus()
  })

  it('no llama a la API cuando el email es inválido', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/^email/i), 'no-es-un-email')
    await user.type(screen.getByLabelText(CAMPO_PASSWORD), 'password123')
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

    await user.type(screen.getByLabelText(/^email/i), 'admin@example.com')
    await user.type(screen.getByLabelText(CAMPO_PASSWORD), 'password123')
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

  it('Enter en la contraseña envía el formulario', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(screen.getByLabelText(/^email/i), 'admin@example.com')
    await user.type(screen.getByLabelText(CAMPO_PASSWORD), 'password123{Enter}')

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
  })

  it('muestra y oculta la contraseña con aria-pressed', async () => {
    const user = userEvent.setup()
    renderLoginPage()
    const campo = screen.getByLabelText(CAMPO_PASSWORD)
    expect(campo).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')
    const ocultar = screen.getByRole('button', { name: 'Ocultar contraseña' })
    expect(ocultar).toHaveAttribute('aria-pressed', 'true')

    await user.click(ocultar)
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('avisa del Bloq Mayús activado y lo retira al apagarlo', () => {
    renderLoginPage()
    const campo = screen.getByLabelText(CAMPO_PASSWORD)

    act(() => {
      campo.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'A', bubbles: true, modifierCapsLock: true }),
      )
    })
    expect(screen.getByText('Bloq Mayús activado')).toBeInTheDocument()

    act(() => {
      campo.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock', bubbles: true }))
    })
    expect(screen.queryByText('Bloq Mayús activado')).not.toBeInTheDocument()
  })

  it('recordar email: guarda solo el email al ingresar y lo precarga después', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_v, { onSuccess }) =>
      onSuccess({ email: 'x@y.com', nombre: 'X' }),
    )
    const { unmount } = renderLoginPage()

    await user.type(screen.getByLabelText(/^email/i), 'admin@example.com')
    await user.type(screen.getByLabelText(CAMPO_PASSWORD), 'password123')
    await user.click(screen.getByRole('checkbox', { name: /recordar mi email/i }))
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(window.localStorage.getItem('login-email')).toBe('admin@example.com')
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('password123')
    unmount()

    useAuthStore.setState({ admin: null, isAuthenticated: false })
    renderLoginPage()
    expect(screen.getByLabelText(/^email/i)).toHaveValue('admin@example.com')
    expect(screen.getByRole('checkbox', { name: /recordar mi email/i })).toBeChecked()
    expect(screen.getByLabelText(CAMPO_PASSWORD)).toHaveFocus()
  })

  it('sin la casilla marcada borra el email recordado', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('login-email', 'viejo@example.com')
    mutateMock.mockImplementation((_v, { onSuccess }) =>
      onSuccess({ email: 'x@y.com', nombre: 'X' }),
    )
    renderLoginPage()

    await user.click(screen.getByRole('checkbox', { name: /recordar mi email/i }))
    await user.type(screen.getByLabelText(CAMPO_PASSWORD), 'password123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(window.localStorage.getItem('login-email')).toBeNull()
  })

  it('401 de credenciales: texto propio sin eco del API y foco en la contraseña vacía', () => {
    useLoginState.error = new ApiError('Credenciales inválidas', 401)
    renderLoginPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Credenciales inválidas')
    expect(screen.getByLabelText(CAMPO_PASSWORD)).toHaveFocus()
    expect(screen.getByLabelText(CAMPO_PASSWORD)).toHaveValue('')
  })

  it('401 de bloqueo: mensaje del API y nota de espera', () => {
    useLoginState.error = new ApiError(
      'Cuenta bloqueada temporalmente. Intenta en 14 minutos.',
      401,
    )
    renderLoginPage()

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Cuenta bloqueada temporalmente. Intenta en 14 minutos.')
    expect(alerta).toHaveTextContent(
      'El bloqueo dura unos minutos; vuelve a intentarlo más tarde.',
    )
  })

  it('429: demasiados intentos', () => {
    useLoginState.error = new ApiError('ThrottlerException: Too Many Requests', 429)
    renderLoginPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
    )
  })

  it('error de red (TypeError) y 5xx: mensaje de conexión', () => {
    const esperado =
      'No se pudo contactar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
    useLoginState.error = new TypeError('Failed to fetch')
    const { unmount } = renderLoginPage()
    expect(screen.getByRole('alert')).toHaveTextContent(esperado)
    unmount()

    useLoginState.error = new ApiError('Internal server error', 503)
    renderLoginPage()
    expect(screen.getByRole('alert')).toHaveTextContent(esperado)
  })

  it('sesión expirada muestra el aviso informativo', () => {
    renderLoginPage('/admin/login?sesion=expirada')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tu sesión expiró. Inicia sesión de nuevo.',
    )
  })

  it('durante el envío deshabilita los campos y muestra "Ingresando…"', () => {
    useLoginState.isPending = true
    renderLoginPage()

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled()
    expect(screen.getByLabelText(/^email/i)).toBeDisabled()
    expect(screen.getByLabelText(CAMPO_PASSWORD)).toBeDisabled()
  })

  it('con prefers-reduced-motion la tarjeta no parte de opacidad 0; sin él sí', () => {
    mockMatchMedia(true)
    const { unmount } = renderLoginPage()
    const envoltorio = () =>
      document.querySelector('[data-slot="card"]')!.parentElement as HTMLElement
    expect(envoltorio().style.opacity).not.toBe('0')
    unmount()

    mockMatchMedia(false)
    renderLoginPage()
    expect(envoltorio().style.opacity).toBe('0')
  })
})
