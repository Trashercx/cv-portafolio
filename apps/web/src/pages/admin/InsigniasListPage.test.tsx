import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InsigniasListPage } from './InsigniasListPage'

/** Fase 7d, UC-35: la página lista, abre el diálogo de importación y el de edición. */

const estado: { data: unknown; isLoading: boolean; error: unknown } = {
  data: [],
  isLoading: false,
  error: null,
}

vi.mock('@/features/insignias/useInsignias', () => ({
  useInsignias: () => estado,
  useReordenarInsignias: () => ({ mutate: vi.fn(), isPending: false }),
  useActualizarInsignia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useEliminarInsignia: () => ({ mutate: vi.fn(), isPending: false }),
  useCrearInsignia: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useImportarInsignia: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useImportarArchivoInsignia: () => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}))

vi.mock('@/features/media/useMediaLibrary', () => ({
  useMediaList: () => ({ data: [] }),
  useMedia: () => ({ data: undefined }),
}))

vi.mock('@/features/paleta-comandos/contexto-paleta', () => ({
  useComandosContextuales: vi.fn(),
}))

const INSIGNIA = {
  id: 'i1',
  usuario_admin_id: 'admin-1',
  nombre: 'AWS Cloud Practitioner',
  emisor: 'Amazon Web Services',
  descripcion: null,
  proveedor: 'credly',
  id_externo: null,
  url_verificacion: null,
  url_origen: null,
  imagen_media_id: 'm1',
  fecha_emision: null,
  fecha_expiracion: null,
  habilidades: [],
  orden: 0,
  visible: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

function renderPagina() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <InsigniasListPage />
    </QueryClientProvider>,
  )
}

describe('InsigniasListPage (Fase 7d, UC-35)', () => {
  it('sin insignias muestra el estado vacío', () => {
    estado.data = []
    renderPagina()

    expect(screen.getByRole('heading', { name: 'Insignias' })).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay insignias cargadas.')).toBeInTheDocument()
  })

  it('"Importar insignia" abre el diálogo de importación', async () => {
    estado.data = []
    const user = userEvent.setup()
    renderPagina()

    // Fase 7m (#68): con la lista vacía hay dos accesos (cabecera y estado vacío).
    const botones = screen.getAllByRole('button', { name: 'Importar insignia' })
    expect(botones).toHaveLength(2)
    await user.click(botones[0])

    expect(await screen.findByRole('dialog', { name: 'Importar insignia' })).toBeInTheDocument()
  })

  it('el botón del estado vacío también abre la importación (Fase 7m, #68)', async () => {
    estado.data = []
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getAllByRole('button', { name: 'Importar insignia' })[1])

    expect(await screen.findByRole('dialog', { name: 'Importar insignia' })).toBeInTheDocument()
  })

  it('"Editar" abre el diálogo con los datos de la insignia', async () => {
    estado.data = [INSIGNIA]
    const user = userEvent.setup()
    renderPagina()

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    expect(await screen.findByRole('dialog', { name: 'Editar insignia' })).toBeInTheDocument()
    expect(await screen.findByDisplayValue('AWS Cloud Practitioner')).toBeInTheDocument()
  })
})
