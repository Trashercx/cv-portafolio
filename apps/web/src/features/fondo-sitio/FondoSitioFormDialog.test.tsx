import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FondoSitioFormDialog } from './FondoSitioFormDialog'

const crearMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useFondosSitio', () => ({
  useCrearFondoSitio: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
}))

describe('FondoSitioFormDialog', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('llama a la mutación con los valores por defecto al crear sin cambiar nada', async () => {
    const user = userEvent.setup()
    render(<FondoSitioFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo fondo/i }))
    await user.click(screen.getByRole('button', { name: /crear fondo/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        tipo: 'degradado_animado',
        configuracion: { velocidad: 'media', opacidad: 0.5 },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('llama a la mutación con el tipo, la velocidad y la opacidad elegidos', async () => {
    const user = userEvent.setup()
    render(<FondoSitioFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo fondo/i }))

    await user.click(screen.getByRole('combobox', { name: /tipo de fondo/i }))
    await user.click(await screen.findByRole('option', { name: 'Aurora animada' }))

    await user.click(screen.getByRole('combobox', { name: /velocidad/i }))
    await user.click(await screen.findByRole('option', { name: 'Lenta' }))

    const inputOpacidad = screen.getByLabelText(/opacidad/i)
    await user.clear(inputOpacidad)
    await user.type(inputOpacidad, '0.2')

    await user.click(screen.getByRole('button', { name: /crear fondo/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        tipo: 'aurora_animada',
        configuracion: { velocidad: 'lenta', opacidad: 0.2 },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )

    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: () => void
    }
    opciones.onSuccess()
  })

  it('rechaza una opacidad fuera de rango', async () => {
    const user = userEvent.setup()
    render(<FondoSitioFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo fondo/i }))

    const inputOpacidad = screen.getByLabelText(/opacidad/i)
    await user.clear(inputOpacidad)
    await user.type(inputOpacidad, '1.5')

    await user.click(screen.getByRole('button', { name: /crear fondo/i }))

    expect(
      await screen.findByText(/la opacidad debe ser como máximo 1/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })
})
