import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Proyecto } from '@/features/proyectos/types'
import { ProyectosListPage } from './ProyectosListPage'

/** Fase 7l, UC-36: tarjeta de GitHub, distintivo e interruptor "Mantener sincronizado". */

const alternarMutate = vi.fn()
const estado: { data: Proyecto[] } = { data: [] }

vi.mock('@/features/proyectos/useProyectos', () => ({
  useProyectos: () => ({ data: estado.data, isLoading: false, error: null }),
}))

vi.mock('@/features/proyectos/useProyectoMutations', () => ({
  useReordenarProyectos: () => ({ mutate: vi.fn(), isPending: false }),
  useEliminarProyecto: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/features/proyectos/ProyectoFormDialog', () => ({
  ProyectoFormDialog: () => null,
}))

vi.mock('@/features/integracion-github/TarjetaIntegracionGithub', () => ({
  TarjetaIntegracionGithub: () => <section aria-label="Integración GitHub" />,
}))

vi.mock('@/features/integracion-github/useIntegracionGithub', () => ({
  useAlternarSincronizacionProyecto: () => ({ mutate: alternarMutate, isPending: false }),
}))

vi.mock('@/features/paleta-comandos/contexto-paleta', () => ({
  useComandosContextuales: vi.fn(),
}))

const BASE: Proyecto = {
  id: 'p1',
  usuario_admin_id: 'admin-1',
  titulo: 'Proyecto manual',
  descripcion: 'x',
  url_demo: null,
  url_repositorio: null,
  fecha_inicio: '2024-01-01',
  fecha_fin: null,
  estado: 'finalizado',
  destacado: false,
  orden: 0,
  tecnologias: [],
  imagenes: [],
}

describe('ProyectosListPage (Fase 7l, UC-36)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    estado.data = []
  })

  it('muestra la tarjeta de la integración con GitHub', () => {
    render(<ProyectosListPage />)
    expect(screen.getByRole('region', { name: 'Integración GitHub' })).toBeInTheDocument()
  })

  it('solo los proyectos importados llevan el distintivo y el interruptor', () => {
    estado.data = [
      BASE,
      { ...BASE, id: 'p2', titulo: 'Mi Repo', orden: 1, origen: 'github', sincronizar_github: true },
      { ...BASE, id: 'p3', titulo: 'Repo viejo', orden: 2, origen: 'manual' },
    ]
    render(<ProyectosListPage />)
    expect(screen.getAllByText('GitHub')).toHaveLength(1)
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(screen.getByRole('switch', { name: 'Mantener sincronizado Mi Repo' })).toBeChecked()
  })

  it('el interruptor envía sincronizar_github al apagar y al encender', async () => {
    const user = userEvent.setup()
    estado.data = [
      { ...BASE, id: 'p2', titulo: 'Mi Repo', origen: 'github', sincronizar_github: true },
      { ...BASE, id: 'p4', titulo: 'Congelado', orden: 1, origen: 'github', sincronizar_github: false },
    ]
    render(<ProyectosListPage />)

    await user.click(screen.getByRole('switch', { name: 'Mantener sincronizado Mi Repo' }))
    expect(alternarMutate).toHaveBeenLastCalledWith({ id: 'p2', sincronizar_github: false })

    const congelado = screen.getByRole('switch', { name: 'Mantener sincronizado Congelado' })
    expect(congelado).not.toBeChecked()
    await user.click(congelado)
    expect(alternarMutate).toHaveBeenLastCalledWith({ id: 'p4', sincronizar_github: true })
  })
})
