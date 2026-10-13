import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tema } from '@/features/tema/types'
import { PanelTemaEditor } from './PanelTemaEditor'

const activarMutateMock = vi.fn()
const eliminarMutateMock = vi.fn()
const crearMutateMock = vi.fn()

const temasMock: { data: Tema[] | undefined; isLoading: boolean; error: unknown } = {
  data: [],
  isLoading: false,
  error: null,
}

vi.mock('@/features/tema/useTemas', () => ({
  useTemas: () => ({
    data: temasMock.data,
    isLoading: temasMock.isLoading,
    error: temasMock.error,
  }),
  useActivarTema: () => ({ mutate: activarMutateMock, isPending: false }),
  useEliminarTema: () => ({ mutate: eliminarMutateMock, isPending: false }),
  useCrearTema: () => ({ mutate: crearMutateMock, isPending: false, error: null }),
}))

const TEMA_ACTIVO: Tema = {
  id: 'tema-1',
  usuario_admin_id: 'admin-1',
  nombre: 'Claro',
  modo: 'claro',
  color_primario: '#111111',
  color_secundario: '#222222',
  color_fondo: '#ffffff',
  color_texto: '#000000',
  fuente_principal: 'sans_sistema',
  activo: true,
}

const TEMA_INACTIVO: Tema = {
  ...TEMA_ACTIVO,
  id: 'tema-2',
  nombre: 'Oscuro',
  modo: 'oscuro',
  activo: false,
}

/**
 * Migrado de la extinta `TemaPage` (UC-08, fusionada en el panel lateral del
 * editor — ver `PanelLateralEditor`): esta suite nunca existió como
 * `TemaPage.test.tsx` (no había cobertura previa), se agrega acá para no
 * dejar sin tests una pieza de UI reusada 1:1 (`useTemas`/`useActivarTema`/
 * `useEliminarTema`/`TemaFormDialog`, sin lógica de mutación propia).
 */
describe('PanelTemaEditor (UC-08)', () => {
  beforeEach(() => {
    temasMock.data = []
    temasMock.isLoading = false
    temasMock.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra un mensaje cuando todavía no hay ningún tema activo', () => {
    render(<PanelTemaEditor />)

    expect(
      screen.getByText(/todavía no hay ningún tema activo/i),
    ).toBeInTheDocument()
  })

  it('muestra la vista previa y la lista de temas, marcando "Activo" al que corresponde', () => {
    temasMock.data = [TEMA_ACTIVO, TEMA_INACTIVO]
    render(<PanelTemaEditor />)

    expect(screen.getByText('Claro (claro)')).toBeInTheDocument()
    expect(screen.getAllByText('Activo')).toHaveLength(2) // badge de la vista previa + badge de la card
    expect(screen.getByText('Oscuro')).toBeInTheDocument()
  })

  it('activa un tema al presionar "Activar"', async () => {
    temasMock.data = [TEMA_ACTIVO, TEMA_INACTIVO]
    const user = userEvent.setup()
    render(<PanelTemaEditor />)

    await user.click(screen.getByRole('button', { name: /^activar$/i }))

    expect(activarMutateMock).toHaveBeenCalledWith('tema-2')
  })

  it('pide confirmación antes de eliminar un tema', async () => {
    temasMock.data = [TEMA_ACTIVO]
    const user = userEvent.setup()
    render(<PanelTemaEditor />)

    await user.click(screen.getByRole('button', { name: /eliminar/i }))
    const dialogo = await screen.findByRole('alertdialog')
    await user.click(within(dialogo).getByRole('button', { name: /^eliminar$/i }))

    expect(eliminarMutateMock).toHaveBeenCalledWith('tema-1')
  })
})
