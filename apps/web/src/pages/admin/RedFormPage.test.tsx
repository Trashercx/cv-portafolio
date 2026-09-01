import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RedFormPage } from './RedFormPage'

const PLATAFORMA_GITHUB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PLATAFORMA_LINKEDIN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

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

vi.mock('@/features/redes-sociales/useRedesSociales', () => ({
  useRedSocial: () => ({ data: undefined, isLoading: false }),
  useCrearRedSocial: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarRedSocial: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
}))

vi.mock('@/features/redes-sociales/usePlataformasRed', () => ({
  usePlataformasRed: () => ({
    data: [
      {
        id: PLATAFORMA_GITHUB_ID,
        nombre: 'GitHub',
        icono_defecto: 'github',
      },
      {
        id: PLATAFORMA_LINKEDIN_ID,
        nombre: 'LinkedIn',
        icono_defecto: 'linkedin',
      },
    ],
    isLoading: false,
  }),
}))

function renderRedFormPage() {
  return render(
    <MemoryRouter>
      <RedFormPage />
    </MemoryRouter>,
  )
}

describe('RedFormPage (nuevo)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderRedFormPage()

    // no selecciona plataforma, deja la URL vacía
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/selecciona una plataforma/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    renderRedFormPage()

    await user.click(screen.getByRole('combobox', { name: /plataforma/i }))
    await user.click(await screen.findByRole('option', { name: 'GitHub' }))

    await user.type(screen.getByLabelText(/^url$/i), 'https://github.com/foo')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        plataforma_id: PLATAFORMA_GITHUB_ID,
        url: 'https://github.com/foo',
        orden: 0,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
