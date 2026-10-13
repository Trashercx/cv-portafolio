import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import { PanelFondoEditor } from './PanelFondoEditor'

const activarMutateMock = vi.fn()
const eliminarMutateMock = vi.fn()
const crearMutateMock = vi.fn()

const fondosMock: {
  data: FondoSitio[] | undefined
  isLoading: boolean
  error: unknown
} = {
  data: [],
  isLoading: false,
  error: null,
}

vi.mock('@/features/fondo-sitio/useFondosSitio', () => ({
  useFondosSitio: () => ({
    data: fondosMock.data,
    isLoading: fondosMock.isLoading,
    error: fondosMock.error,
  }),
  useActivarFondoSitio: () => ({ mutate: activarMutateMock, isPending: false }),
  useEliminarFondoSitio: () => ({ mutate: eliminarMutateMock, isPending: false }),
  useCrearFondoSitio: () => ({ mutate: crearMutateMock, isPending: false, error: null }),
}))

const FONDO_ACTIVO: FondoSitio = {
  id: 'fondo-1',
  usuario_admin_id: 'admin-1',
  tipo: 'aurora_animada',
  configuracion: { velocidad: 'media', opacidad: 0.5 },
  activo: true,
}

const FONDO_INACTIVO: FondoSitio = {
  ...FONDO_ACTIVO,
  id: 'fondo-2',
  tipo: 'particulas',
  activo: false,
}

/**
 * Migrado de la extinta `FondoSitioPage` (UC-15, fusionada en el panel
 * lateral del editor — ver `PanelLateralEditor`): esta suite nunca existió
 * como `FondoSitioPage.test.tsx` (no había cobertura previa), se agrega acá
 * para no dejar sin tests una pieza de UI reusada 1:1 (`useFondosSitio`/
 * `useActivarFondoSitio`/`useEliminarFondoSitio`/`FondoSitioFormDialog`, sin
 * lógica de mutación propia).
 */
describe('PanelFondoEditor (UC-15)', () => {
  beforeEach(() => {
    fondosMock.data = []
    fondosMock.isLoading = false
    fondosMock.error = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra un mensaje cuando todavía no hay ningún fondo activo', () => {
    render(<PanelFondoEditor />)

    expect(
      screen.getByText(/todavía no hay ningún fondo activo/i),
    ).toBeInTheDocument()
  })

  it('muestra la vista previa y la lista de fondos, marcando "Activo" al que corresponde', () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    render(<PanelFondoEditor />)

    expect(screen.getAllByText('Aurora animada')).toHaveLength(2) // vista previa + card
    expect(screen.getAllByText('Activo')).toHaveLength(2) // badge de la vista previa + badge de la card
    expect(screen.getByText('Partículas')).toBeInTheDocument()
  })

  it('activa un fondo al presionar "Activar"', async () => {
    fondosMock.data = [FONDO_ACTIVO, FONDO_INACTIVO]
    const user = userEvent.setup()
    render(<PanelFondoEditor />)

    await user.click(screen.getByRole('button', { name: /^activar$/i }))

    expect(activarMutateMock).toHaveBeenCalledWith('fondo-2')
  })

  it('pide confirmación antes de eliminar un fondo', async () => {
    fondosMock.data = [FONDO_ACTIVO]
    const user = userEvent.setup()
    render(<PanelFondoEditor />)

    await user.click(screen.getByRole('button', { name: /eliminar/i }))
    const dialogo = await screen.findByRole('alertdialog')
    await user.click(within(dialogo).getByRole('button', { name: /^eliminar$/i }))

    expect(eliminarMutateMock).toHaveBeenCalledWith('fondo-1')
  })
})
