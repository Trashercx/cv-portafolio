import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RedFormDialog } from './RedFormDialog'
import type { RedSocial } from './types'

const PLATAFORMA_GITHUB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PLATAFORMA_LINKEDIN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useRedesSociales', () => ({
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

vi.mock('./usePlataformasRed', () => ({
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

function renderDialog(onOpenChange = vi.fn()) {
  return render(
    <RedFormDialog red={null} open onOpenChange={onOpenChange} />,
  )
}

const RED_LINKEDIN_EXISTENTE: RedSocial = {
  id: 'red-existente',
  usuario_admin_id: 'admin-1',
  plataforma_id: PLATAFORMA_LINKEDIN_ID,
  url: 'https://linkedin.com/in/existente',
  orden: 2,
  plataforma: { id: PLATAFORMA_LINKEDIN_ID, nombre: 'LinkedIn', icono_defecto: 'linkedin' },
}

/** Wrapper con estado propio de `open`, para poder cerrar/reabrir el diálogo como lo haría la `*ListPage`. */
function WrapperControlado({ red }: { red: RedSocial | null }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button onClick={() => setOpen(true)}>Reabrir</button>
      <RedFormDialog red={red} open={open} onOpenChange={setOpen} />
    </>
  )
}

describe('RedFormDialog (nuevo)', () => {
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

    // no selecciona plataforma, deja la URL vacía
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(
      await screen.findByText(/selecciona una plataforma/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto y cierra el modal al guardar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

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

    // simula el onSuccess de la mutación cerrando el modal
    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: () => void
    }
    opciones.onSuccess()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('modo edición: precarga el enlace existente y llama a actualizar, no a crear', async () => {
    const user = userEvent.setup()
    render(
      <RedFormDialog
        red={RED_LINKEDIN_EXISTENTE}
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^url$/i)).toHaveValue(
      'https://linkedin.com/in/existente',
    )

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(actualizarMutateMock).toHaveBeenCalledTimes(1))
    expect(actualizarMutateMock).toHaveBeenCalledWith(
      {
        plataforma_id: PLATAFORMA_LINKEDIN_ID,
        url: 'https://linkedin.com/in/existente',
        orden: 2,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('pide confirmación al intentar cerrar sin guardar (Esc) en vez de cerrar de inmediato', async () => {
    const user = userEvent.setup()
    render(<WrapperControlado red={null} />)

    await user.type(screen.getByLabelText(/^url$/i), 'texto sucio sin guardar')

    // Esc, como haría el admin sin querer: no debe cerrar de inmediato.
    await user.keyboard('{Escape}')

    const confirmacion = await screen.findByRole('alertdialog')
    expect(
      within(confirmacion).getByText(/¿descartar cambios\?/i),
    ).toBeInTheDocument()
    // El formulario sigue montado, con el valor sucio intacto.
    expect(screen.getByLabelText(/^url$/i)).toHaveValue(
      'texto sucio sin guardar',
    )
  })

  it('"Cancelar" en la confirmación mantiene el modal abierto con los cambios', async () => {
    const user = userEvent.setup()
    render(<WrapperControlado red={null} />)

    await user.type(screen.getByLabelText(/^url$/i), 'texto sucio sin guardar')
    await user.keyboard('{Escape}')

    const confirmacion = await screen.findByRole('alertdialog')
    await user.click(
      within(confirmacion).getByRole('button', { name: /^cancelar$/i }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/^url$/i)).toHaveValue(
      'texto sucio sin guardar',
    )
  })

  it('"Descartar" en la confirmación cierra el modal, y resetea el formulario al reabrir (mismo estado "nuevo")', async () => {
    const user = userEvent.setup()
    render(<WrapperControlado red={null} />)

    await user.type(screen.getByLabelText(/^url$/i), 'texto sucio sin guardar')

    // cierra sin guardar (Escape, como haría el admin), confirmando el descarte
    await user.keyboard('{Escape}')
    const confirmacion = await screen.findByRole('alertdialog')
    await user.click(
      within(confirmacion).getByRole('button', { name: /^descartar$/i }),
    )
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/^url$/i),
      ).not.toBeInTheDocument(),
    )

    // reabre en el mismo estado "nuevo"
    await user.click(screen.getByRole('button', { name: /reabrir/i }))

    expect(await screen.findByLabelText(/^url$/i)).toHaveValue('')
  })
})
