import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogroFormPage } from './LogroFormPage'

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

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('@/features/logros/useLogros', () => ({
  useLogro: () => ({ data: undefined, isLoading: false }),
  useCrearLogro: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarLogro: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
}))

function renderLogroFormPage() {
  return render(
    <MemoryRouter>
      <LogroFormPage />
    </MemoryRouter>,
  )
}

describe('LogroFormPage (nuevo)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderLogroFormPage()

    // deja "título" vacío
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del logro',
    )
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/el título es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    renderLogroFormPage()

    await user.type(screen.getByLabelText(/título/i), 'Hackathon ganador')
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del logro',
    )
    fireEvent.change(screen.getByLabelText(/^fecha$/i), {
      target: { value: '2024-01-01' },
    })
    await user.type(screen.getByLabelText(/categoría/i), 'Competencia')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        titulo: 'Hackathon ganador',
        descripcion: 'Descripción del logro',
        fecha: '2024-01-01',
        categoria: 'Competencia',
        url_referencia: undefined,
        orden: 0,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
