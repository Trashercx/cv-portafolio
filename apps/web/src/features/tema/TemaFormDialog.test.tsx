import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemaFormDialog } from './TemaFormDialog'

const crearMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useTemas', () => ({
  useCrearTema: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
}))

describe('TemaFormDialog', () => {
  beforeEach(() => {
    crearState.isPending = false
    crearState.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no llama a la mutación cuando falta el nombre', async () => {
    const user = userEvent.setup()
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    expect(
      await screen.findByText(/el nombre es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('llama a la mutación con el payload correcto (colores por defecto + modo elegido)', async () => {
    const user = userEvent.setup()
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))
    await user.type(screen.getByLabelText(/^nombre$/i), 'Tema oscuro')

    await user.click(screen.getByRole('combobox', { name: /modo/i }))
    await user.click(await screen.findByRole('option', { name: 'Oscuro' }))

    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Tema oscuro',
        color_primario: '#2563eb',
        color_secundario: '#7c3aed',
        color_fondo: '#ffffff',
        color_texto: '#0f172a',
        fuente_principal: 'Inter',
        modo: 'oscuro',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('precarga el formulario al elegir una plantilla predefinida (editable antes de guardar)', async () => {
    const user = userEvent.setup()
    render(<TemaFormDialog />)

    await user.click(screen.getByRole('button', { name: /nuevo tema/i }))

    await user.click(
      screen.getByRole('combobox', { name: /plantilla predefinida/i }),
    )
    await user.click(await screen.findByRole('option', { name: /océano/i }))

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Océano')

    await user.click(screen.getByRole('button', { name: /crear tema/i }))

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        nombre: 'Océano',
        color_primario: '#0284c7',
        color_secundario: '#0891b2',
        color_fondo: '#f0f9ff',
        color_texto: '#0c4a6e',
        fuente_principal: 'Inter',
        modo: 'claro',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })
})
