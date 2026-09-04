import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogroFormDialog } from './LogroFormDialog'
import type { Logro } from './types'

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useLogros', () => ({
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

function renderDialog(onOpenChange = vi.fn()) {
  return render(
    <LogroFormDialog logro={null} open onOpenChange={onOpenChange} />,
  )
}

const LOGRO_EXISTENTE: Logro = {
  id: 'logro-existente',
  usuario_admin_id: 'admin-1',
  titulo: 'Beca de investigación',
  descripcion: 'Descripción existente',
  fecha: '2023-05-10',
  categoria: 'Académico',
  url_referencia: null,
  orden: 3,
}

/** Wrapper con estado propio de `open`, para poder cerrar/reabrir el diálogo como lo haría la `*ListPage`. */
function WrapperControlado({ logro }: { logro: Logro | null }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button onClick={() => setOpen(true)}>Reabrir</button>
      <LogroFormDialog logro={logro} open={open} onOpenChange={setOpen} />
    </>
  )
}

describe('LogroFormDialog (nuevo)', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no llama a la mutación cuando falta un campo obligatorio', async () => {
    const user = userEvent.setup()
    renderDialog()

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

  it('llama a la mutación con el payload correcto y cierra el modal al guardar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

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

    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: () => void
    }
    opciones.onSuccess()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('muestra el link "Ver enlace" cuando la URL de referencia es válida', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(
      screen.queryByRole('link', { name: /ver enlace/i }),
    ).not.toBeInTheDocument()

    await user.type(
      screen.getByLabelText(/url de referencia/i),
      'https://ejemplo.com/nota',
    )

    const link = await screen.findByRole('link', { name: /ver enlace/i })
    expect(link).toHaveAttribute('href', 'https://ejemplo.com/nota')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('no muestra el link "Ver enlace" cuando la URL de referencia es inválida o está vacía', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(
      screen.queryByRole('link', { name: /ver enlace/i }),
    ).not.toBeInTheDocument()

    await user.type(
      screen.getByLabelText(/url de referencia/i),
      'no-es-una-url',
    )

    expect(
      screen.queryByRole('link', { name: /ver enlace/i }),
    ).not.toBeInTheDocument()
  })

  it('modo edición: precarga el logro existente y llama a actualizar, no a crear', async () => {
    const user = userEvent.setup()
    render(
      <LogroFormDialog
        logro={LOGRO_EXISTENTE}
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/título/i)).toHaveValue('Beca de investigación')
    expect(screen.getByLabelText(/descripción/i)).toHaveValue(
      'Descripción existente',
    )
    expect(screen.getByLabelText(/categoría/i)).toHaveValue('Académico')

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(actualizarMutateMock).toHaveBeenCalledTimes(1))
    expect(actualizarMutateMock).toHaveBeenCalledWith(
      {
        titulo: 'Beca de investigación',
        descripcion: 'Descripción existente',
        fecha: '2023-05-10',
        categoria: 'Académico',
        url_referencia: undefined,
        orden: 3,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('pide confirmación al intentar cerrar sin guardar (Esc), y "Descartar" cierra el modal y resetea el formulario al reabrir (mismo estado "nuevo")', async () => {
    const user = userEvent.setup()
    render(<WrapperControlado logro={null} />)

    await user.type(screen.getByLabelText(/título/i), 'texto sucio sin guardar')
    expect(screen.getByLabelText(/título/i)).toHaveValue(
      'texto sucio sin guardar',
    )

    // cierra sin guardar (Escape, como haría el admin): no cierra de
    // inmediato, pide confirmación primero.
    await user.keyboard('{Escape}')
    const confirmacion = await screen.findByRole('alertdialog')
    expect(
      within(confirmacion).getByText(/¿descartar cambios\?/i),
    ).toBeInTheDocument()

    await user.click(
      within(confirmacion).getByRole('button', { name: /^descartar$/i }),
    )
    await waitFor(() =>
      expect(screen.queryByLabelText(/título/i)).not.toBeInTheDocument(),
    )

    // reabre en el mismo estado "nuevo"
    await user.click(screen.getByRole('button', { name: /reabrir/i }))

    expect(await screen.findByLabelText(/título/i)).toHaveValue('')
  })
})
