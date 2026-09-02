import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CertificacionFormPage } from './CertificacionFormPage'

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

vi.mock('@/features/certificaciones/useCertificaciones', () => ({
  useCertificacion: () => ({ data: undefined, isLoading: false }),
  useCrearCertificacion: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarCertificacion: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
}))

function renderCertificacionFormPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CertificacionFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CertificacionFormPage (nueva)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('el campo de logo acepta imagen o PDF (feedback externo, UC-04: certificado como documento verificable)', () => {
    renderCertificacionFormPage()

    const inputLogo = screen.getByLabelText(
      /logo o documento del certificado \(imagen o pdf\)/i,
    )
    expect(inputLogo).toHaveAttribute('accept', 'image/*,application/pdf')
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderCertificacionFormPage()

    // deja "nombre" vacío
    await user.type(screen.getByLabelText(/institución/i), 'AWS')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/el nombre es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto cuando el formulario es válido', async () => {
    const user = userEvent.setup()
    renderCertificacionFormPage()

    await user.type(screen.getByLabelText(/^nombre$/i), 'AWS Certified')
    await user.type(screen.getByLabelText(/institución/i), 'Amazon')
    fireEvent.change(screen.getByLabelText(/fecha de emisión/i), {
      target: { value: '2024-01-01' },
    })
    await user.type(
      screen.getByLabelText(/url de verificación/i),
      'https://aws.amazon.com/verify/123',
    )

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'AWS Certified',
        institucion: 'Amazon',
        fecha_emision: '2024-01-01',
        fecha_expiracion: undefined,
        url_verificacion: 'https://aws.amazon.com/verify/123',
        credencial_id: undefined,
        logo_media_id: undefined,
        orden: 0,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
