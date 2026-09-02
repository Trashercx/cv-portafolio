import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProyectoFormDialog } from './ProyectoFormDialog'
import type { ProyectoBase } from './types'

const crearMutateMock = vi.fn()
const actualizarMutateMock = vi.fn()
const crearState: { isPending: boolean; error: unknown } = {
  isPending: false,
  error: null,
}

vi.mock('./useProyectoMutations', () => ({
  useCrearProyecto: () => ({
    mutate: crearMutateMock,
    isPending: crearState.isPending,
    error: crearState.error,
  }),
  useActualizarProyecto: () => ({
    mutate: actualizarMutateMock,
    isPending: false,
    error: null,
  }),
  useAgregarTecnologiaProyecto: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useQuitarTecnologiaProyecto: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useAgregarImagenProyecto: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useQuitarImagenProyecto: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useReordenarImagenesProyecto: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}))

vi.mock('./useProyectos', () => ({
  useProyecto: () => ({
    data: { id: 'proyecto-creado', tecnologias: [], imagenes: [] },
    isLoading: false,
  }),
  useProyectos: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/features/tecnologias/useTecnologias', () => ({
  useTecnologias: () => ({ data: [], isLoading: false }),
  useCrearTecnologia: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ProyectoFormDialog proyecto={null} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
}

const PROYECTO_EXISTENTE: ProyectoBase = {
  id: 'proyecto-existente',
  usuario_admin_id: 'admin-1',
  titulo: 'Proyecto ya guardado',
  descripcion: 'Descripción ya guardada',
  url_demo: null,
  url_repositorio: null,
  fecha_inicio: '2023-06-01',
  fecha_fin: null,
  estado: 'finalizado',
  destacado: false,
  orden: 4,
}

describe('ProyectoFormDialog (nuevo)', () => {
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
      'Descripción del proyecto',
    )
    await user.click(
      screen.getByRole('button', { name: /crear y continuar/i }),
    )

    expect(
      await screen.findByText(/el título es obligatorio/i),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
  })

  it('crea el proyecto sin cerrar el modal y muestra selector de tecnologías/galería (flujo de dos pasos)', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

    // Antes de crear: ni tecnologías ni galería, solo el aviso de que hay que guardar primero.
    expect(screen.queryByText(/^tecnologías$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^imágenes$/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/título/i), 'Proyecto X')
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del proyecto',
    )
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2024-01-01' },
    })
    await user.type(screen.getByLabelText(/^estado$/i), 'en_progreso')

    await user.click(
      screen.getByRole('button', { name: /crear y continuar/i }),
    )

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      {
        titulo: 'Proyecto X',
        descripcion: 'Descripción del proyecto',
        url_demo: undefined,
        url_repositorio: undefined,
        fecha_inicio: '2024-01-01',
        fecha_fin: undefined,
        estado: 'en_progreso',
        destacado: false,
        orden: 0,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )

    // Simula la creación exitosa: el modal NO se cierra (a diferencia de
    // Redes/Logros/Certificaciones), aparecen tecnologías/galería.
    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: (creado: { id: string }) => void
    }
    act(() => {
      opciones.onSuccess({ id: 'proyecto-creado' })
    })

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(await screen.findByText(/^tecnologías$/i)).toBeInTheDocument()
    expect(screen.getByText(/^imágenes$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^guardar$/i }),
    ).toBeInTheDocument()
  })

  it('edita un proyecto existente sin pasar por el paso de creación', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <ProyectoFormDialog
          proyecto={PROYECTO_EXISTENTE}
          open
          onOpenChange={onOpenChange}
        />
      </QueryClientProvider>,
    )

    // Al editar un proyecto ya guardado, tecnologías/galería aparecen desde
    // el primer render (no hace falta pasar por "Crear y continuar").
    expect(screen.getByLabelText(/título/i)).toHaveValue(
      'Proyecto ya guardado',
    )
    expect(screen.getByText(/^tecnologías$/i)).toBeInTheDocument()
    expect(screen.getByText(/^imágenes$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^guardar$/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /crear y continuar/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^guardar$/i }))

    await waitFor(() =>
      expect(actualizarMutateMock).toHaveBeenCalledTimes(1),
    )
    expect(actualizarMutateMock).toHaveBeenCalledWith(
      {
        titulo: 'Proyecto ya guardado',
        descripcion: 'Descripción ya guardada',
        url_demo: undefined,
        url_repositorio: undefined,
        fecha_inicio: '2023-06-01',
        fecha_fin: undefined,
        estado: 'finalizado',
        destacado: false,
        orden: 4,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(crearMutateMock).not.toHaveBeenCalled()

    // A diferencia del paso de creación, editar SÍ cierra el modal al
    // guardar (vía `handleOpenChange`, que además limpia el estado local).
    const opciones = actualizarMutateMock.mock.calls[0][1] as {
      onSuccess: () => void
    }
    act(() => {
      opciones.onSuccess()
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
