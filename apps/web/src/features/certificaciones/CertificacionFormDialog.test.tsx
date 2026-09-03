import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CertificacionFormDialog } from './CertificacionFormDialog'
import type { Certificacion } from './types'

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useCertificaciones', () => ({
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

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <CertificacionFormDialog
        certificacion={null}
        open
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  )
}

const CERTIFICACION_EXISTENTE: Certificacion = {
  id: 'certificacion-existente',
  usuario_admin_id: 'admin-1',
  nombre: 'Azure Fundamentals',
  institucion: 'Microsoft',
  fecha_emision: '2023-02-15',
  fecha_expiracion: null,
  url_verificacion: 'https://microsoft.com/verify/456',
  credencial_id: null,
  logo_media_id: null,
  orden: 1,
}

/** Wrapper con estado propio de `open`, para poder cerrar/reabrir el diálogo como lo haría la `*ListPage`. */
function WrapperControlado({
  certificacion,
}: {
  certificacion: Certificacion | null
}) {
  const [open, setOpen] = useState(true)
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <button onClick={() => setOpen(true)}>Reabrir</button>
      <CertificacionFormDialog
        certificacion={certificacion}
        open={open}
        onOpenChange={setOpen}
      />
    </QueryClientProvider>
  )
}

describe('CertificacionFormDialog (nueva)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('el campo de logo acepta imagen o PDF (feedback externo, UC-04: certificado como documento verificable)', () => {
    renderDialog()

    const inputLogo = screen.getByLabelText(
      /logo o documento del certificado \(imagen o pdf\)/i,
    )
    expect(inputLogo).toHaveAttribute('accept', 'image/*,application/pdf')
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderDialog()

    // deja "nombre" vacío
    await user.type(screen.getByLabelText(/institución/i), 'AWS')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/el nombre es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto y cierra el modal al guardar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

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

    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: () => void
    }
    opciones.onSuccess()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('rechaza una fecha de expiración anterior o igual a la de emisión, con el error en el campo correcto', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/^nombre$/i), 'AWS Certified')
    await user.type(screen.getByLabelText(/institución/i), 'Amazon')
    fireEvent.change(screen.getByLabelText(/fecha de emisión/i), {
      target: { value: '2024-06-01' },
    })
    fireEvent.change(screen.getByLabelText(/fecha de expiración/i), {
      target: { value: '2024-06-01' },
    })
    await user.type(
      screen.getByLabelText(/url de verificación/i),
      'https://aws.amazon.com/verify/123',
    )

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(
        /la fecha de expiración debe ser posterior a la de emisión/i,
      ),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('modo edición: precarga la certificación existente y llama a actualizar, no a crear', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <CertificacionFormDialog
          certificacion={CERTIFICACION_EXISTENTE}
          open
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Azure Fundamentals')
    expect(screen.getByLabelText(/institución/i)).toHaveValue('Microsoft')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(actualizarMutateMock).toHaveBeenCalledTimes(1))
    expect(actualizarMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Azure Fundamentals',
        institucion: 'Microsoft',
        fecha_emision: '2023-02-15',
        fecha_expiracion: undefined,
        url_verificacion: 'https://microsoft.com/verify/456',
        credencial_id: undefined,
        logo_media_id: undefined,
        orden: 1,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('resetea el formulario al reabrir sin guardar (mismo estado "nueva")', async () => {
    const user = userEvent.setup()
    render(<WrapperControlado certificacion={null} />)

    await user.type(
      screen.getByLabelText(/^nombre$/i),
      'texto sucio sin guardar',
    )
    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue(
      'texto sucio sin guardar',
    )

    // cierra sin guardar (Escape, como haría el admin)
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument(),
    )

    // reabre en el mismo estado "nueva"
    await user.click(screen.getByRole('button', { name: /reabrir/i }))

    expect(await screen.findByLabelText(/^nombre$/i)).toHaveValue('')
  })
})
