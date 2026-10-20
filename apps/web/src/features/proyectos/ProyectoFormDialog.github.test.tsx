import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProyectoFormDialog } from './ProyectoFormDialog'
import type { Proyecto } from './types'

/** Fase 7l, UC-36: un proyecto de GitHub sincronizado se edita en solo lectura. */

const actualizarMutate = vi.fn()

vi.mock('./useProyectoMutations', () => ({
  useCrearProyecto: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useActualizarProyecto: () => ({ mutate: actualizarMutate, isPending: false, error: null }),
  useAgregarTecnologiaProyecto: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useQuitarTecnologiaProyecto: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useAgregarImagenProyecto: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useQuitarImagenProyecto: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useReordenarImagenesProyecto: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const estado: { fresco: Proyecto | undefined } = { fresco: undefined }

vi.mock('./useProyectos', () => ({
  useProyecto: () => ({ data: estado.fresco, isLoading: false }),
  useProyectos: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/features/tecnologias/useTecnologias', () => ({
  useTecnologias: () => ({ data: [], isLoading: false }),
  useCrearTecnologia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const PROYECTO: Proyecto = {
  id: 'p1',
  usuario_admin_id: 'admin-1',
  titulo: 'Mi Repo',
  descripcion: 'Descripción del repo',
  url_demo: 'https://demo.example.com',
  url_repositorio: 'https://github.com/octocat/mi-repo',
  fecha_inicio: '2024-01-01',
  fecha_fin: null,
  estado: 'en_progreso',
  destacado: false,
  orden: 1,
  origen: 'github',
  sincronizar_github: true,
  tecnologias: [],
  imagenes: [],
}

function abrir(proyecto: Proyecto) {
  estado.fresco = proyecto
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ProyectoFormDialog proyecto={proyecto} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('ProyectoFormDialog con proyectos de GitHub (Fase 7l, UC-36)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    estado.fresco = undefined
  })

  it('sincronizado: título, descripción y enlaces en solo lectura con el aviso', () => {
    abrir(PROYECTO)
    expect(screen.getByText(/Desactiva la sincronización para editarlo a mano/)).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Descripción')).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/URL de demo/)).toHaveAttribute('readonly')
    expect(screen.getByLabelText(/URL del repositorio/)).toHaveAttribute('readonly')
  })

  it('al guardar no envía los campos bloqueados', async () => {
    const user = userEvent.setup()
    abrir(PROYECTO)
    await user.click(screen.getByRole('checkbox', { name: 'Destacado' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(actualizarMutate).toHaveBeenCalledTimes(1))
    const payload = actualizarMutate.mock.calls[0][0]
    expect(payload).toMatchObject({ destacado: true, estado: 'en_progreso' })
    for (const clave of ['titulo', 'descripcion', 'url_demo', 'url_repositorio']) {
      expect(payload).not.toHaveProperty(clave)
    }
  })

  it('con la sincronización apagada se edita como un proyecto manual', () => {
    abrir({ ...PROYECTO, sincronizar_github: false })
    expect(screen.queryByText(/Desactiva la sincronización/)).toBeNull()
    expect(screen.getByLabelText('Título')).not.toHaveAttribute('readonly')
  })

  it('un proyecto manual no muestra aviso ni bloqueos', () => {
    abrir({ ...PROYECTO, origen: 'manual' })
    expect(screen.queryByText(/Desactiva la sincronización/)).toBeNull()
    expect(screen.getByLabelText('Descripción')).not.toHaveAttribute('readonly')
  })
})
