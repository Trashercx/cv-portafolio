import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerfilPage } from './PerfilPage'

const mutateMock = vi.fn()
const usePerfilState: { data: unknown; isLoading: boolean } = {
  data: null,
  isLoading: false,
}
const useUpsertPerfilState: {
  isPending: boolean
  error: unknown
  isSuccess: boolean
} = { isPending: false, error: null, isSuccess: false }

vi.mock('@/features/perfil/usePerfil', () => ({
  usePerfil: () => usePerfilState,
}))

vi.mock('@/features/perfil/useUpsertPerfil', () => ({
  useUpsertPerfil: () => ({
    mutate: mutateMock,
    isPending: useUpsertPerfilState.isPending,
    error: useUpsertPerfilState.error,
    isSuccess: useUpsertPerfilState.isSuccess,
  }),
}))

function renderPerfilPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PerfilPage', () => {
  beforeEach(() => {
    usePerfilState.data = null
    usePerfilState.isLoading = false
  })

  afterEach(() => {
    vi.clearAllMocks()
    useUpsertPerfilState.isPending = false
    useUpsertPerfilState.error = null
    useUpsertPerfilState.isSuccess = false
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderPerfilPage()

    await user.type(screen.getByLabelText(/nombre completo/i), 'Oscar Burga')
    // deja el resto de campos obligatorios vacíos
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/título profesional es obligatorio/i),
    ).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    renderPerfilPage()

    await user.type(screen.getByLabelText(/nombre completo/i), 'Oscar Burga')
    await user.type(
      screen.getByLabelText(/título profesional/i),
      'Desarrollador Full Stack',
    )
    await user.type(screen.getByLabelText(/resumen/i), 'Bio de prueba')
    await user.type(screen.getByLabelText(/ubicación/i), 'Lima, Perú')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1))
    expect(mutateMock).toHaveBeenCalledWith({
      nombre_completo: 'Oscar Burga',
      titulo_profesional: 'Desarrollador Full Stack',
      resumen_bio: 'Bio de prueba',
      imagen_perfil_id: undefined,
      cv_media_id: undefined,
      ubicacion: 'Lima, Perú',
    })
  })
})
