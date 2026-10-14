import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InsigniaFormDialog } from './InsigniaFormDialog'
import type { Insignia } from './types'

/** Fase 7e, UC-35: casilla "No expira" al editar una insignia. */

const actualizarMutate = vi.fn()

vi.mock('./useInsignias', () => ({
  useActualizarInsignia: () => ({ mutate: actualizarMutate, isPending: false, error: null }),
}))

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMedia: () => ({ data: null }),
}))

vi.mock('@/components/media/MediaField', () => ({
  MediaField: () => <div />,
}))

function crearInsignia(extra: Partial<Insignia> = {}): Insignia {
  return {
    id: 'ins-1',
    usuario_admin_id: 'admin-1',
    nombre: 'AWS CCP',
    emisor: 'AWS',
    descripcion: null,
    proveedor: 'credly',
    id_externo: null,
    url_verificacion: null,
    url_origen: null,
    imagen_media_id: 'media-1',
    fecha_emision: '2025-01-01',
    fecha_expiracion: null,
    habilidades: [],
    orden: 0,
    visible: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...extra,
  } as Insignia
}

describe('InsigniaFormDialog (Fase 7e, UC-35)', () => {
  beforeEach(() => actualizarMutate.mockReset())

  it('con fecha_expiracion null la casilla llega marcada y PATCH envía null', async () => {
    const user = userEvent.setup()
    render(<InsigniaFormDialog insignia={crearInsignia()} open onOpenChange={vi.fn()} />)

    expect(await screen.findByRole('checkbox', { name: /no expira/i })).toBeChecked()
    expect(screen.getByLabelText('Fecha de expiración')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(actualizarMutate).toHaveBeenCalledTimes(1))
    expect(actualizarMutate.mock.calls[0][0].payload.fecha_expiracion).toBeNull()
  })

  it('con fecha la casilla está desmarcada; marcarla borra la fecha (null)', async () => {
    const user = userEvent.setup()
    render(
      <InsigniaFormDialog
        insignia={crearInsignia({ fecha_expiracion: '2028-01-01T00:00:00.000Z' })}
        open
        onOpenChange={vi.fn()}
      />,
    )

    const casilla = await screen.findByRole('checkbox', { name: /no expira/i })
    expect(casilla).not.toBeChecked()
    expect(screen.getByLabelText('Fecha de expiración')).toHaveValue('2028-01-01')

    await user.click(casilla)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(actualizarMutate).toHaveBeenCalledTimes(1))
    expect(actualizarMutate.mock.calls[0][0].payload.fecha_expiracion).toBeNull()
  })
})
