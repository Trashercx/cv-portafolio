import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProyectoFormPage } from './ProyectoFormPage'

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

vi.mock('@/features/proyectos/useProyectoMutations', () => ({
  useCrearProyecto: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarProyecto: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
}))

vi.mock('@/features/proyectos/useProyectos', () => ({
  useProyecto: () => ({ data: undefined, isLoading: false }),
  useProyectos: () => ({ data: [], isLoading: false }),
}))

function renderProyectoFormPage() {
  return render(
    <MemoryRouter>
      <ProyectoFormPage />
    </MemoryRouter>,
  )
}

describe('ProyectoFormPage (nuevo)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderProyectoFormPage()

    // deja "título" vacío
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del proyecto',
    )
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/el título es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    renderProyectoFormPage()

    await user.type(screen.getByLabelText(/título/i), 'Proyecto X')
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del proyecto',
    )
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2024-01-01' },
    })
    await user.type(screen.getByLabelText(/^estado$/i), 'en_progreso')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        titulo: 'Proyecto X',
        descripcion: 'Descripción del proyecto',
        url_demo: undefined,
        url_repositorio: undefined,
        fecha_inicio: '2024-01-01',
        fecha_fin: undefined,
        estado: 'en_progreso',
        destacado: false,
        orden: 0,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
