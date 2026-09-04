import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    // "En progreso" ya es el valor por defecto del `Select` (Fase 4.2,
    // punto 2), pero se elige explícitamente para no depender de ese default.
    await user.click(screen.getByRole('combobox', { name: /^estado$/i }))
    await user.click(await screen.findByRole('option', { name: 'En progreso' }))

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

  it('regresión: cerrar el modal (Esc) justo después del primer "Crear y continuar" NO pide confirmar el descarte — el proyecto ya está persistido', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

    await user.type(screen.getByLabelText(/título/i), 'Proyecto X')
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del proyecto',
    )
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2024-01-01' },
    })
    // "En progreso" ya es el valor por defecto del `Select` (Fase 4.2,
    // punto 2): no hace falta elegirlo, este test no aserta sobre `estado`.

    await user.click(
      screen.getByRole('button', { name: /crear y continuar/i }),
    )
    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))

    // Simula la creación exitosa (mismo flujo que el test anterior).
    const opciones = crearMutateMock.mock.calls[0][1] as {
      onSuccess: (creado: { id: string }) => void
    }
    act(() => {
      opciones.onSuccess({ id: 'proyecto-creado' })
    })
    await screen.findByText(/^tecnologías$/i)

    // Cierra sin haber hecho el segundo guardado (Esc, como haría el admin
    // tras cargar tecnologías/imágenes): el `onSuccess` de la creación debe
    // haber limpiado `isDirty` con `form.reset(values)`, así que esto NO
    // debe disparar el `AlertDialog` de "¿Descartar cambios?" — el proyecto
    // en sí ya está guardado, solo se pierde la sesión de carga de
    // tecnologías/imágenes, que no es lo que ese mensaje comunica.
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('pide confirmación al intentar cerrar (Esc) con cambios sin guardar antes del primer "Crear y continuar"', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(onOpenChange)

    await user.type(screen.getByLabelText(/título/i), 'Texto sucio sin guardar')

    await user.keyboard('{Escape}')

    const confirmacion = await screen.findByRole('alertdialog')
    expect(
      within(confirmacion).getByText(/¿descartar cambios\?/i),
    ).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(crearMutateMock).not.toHaveBeenCalled()

    await user.click(
      within(confirmacion).getByRole('button', { name: /^descartar$/i }),
    )

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('permite fecha_fin igual a fecha_inicio (un proyecto puede empezar y terminar el mismo día)', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/título/i), 'Proyecto de un día')
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del proyecto',
    )
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2024-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/fecha de fin/i), {
      target: { value: '2024-01-01' },
    })
    // "En progreso" (valor por defecto del `Select`, Fase 4.2, punto 2) es
    // suficiente acá: este test no aserta sobre `estado`.

    await user.click(
      screen.getByRole('button', { name: /crear y continuar/i }),
    )

    await waitFor(() => expect(crearMutateMock).toHaveBeenCalledTimes(1))
    expect(crearMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-01',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('rechaza fecha_fin anterior a fecha_inicio', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText(/título/i), 'Proyecto inválido')
    await user.type(
      screen.getByLabelText(/descripción/i),
      'Descripción del proyecto',
    )
    fireEvent.change(screen.getByLabelText(/fecha de inicio/i), {
      target: { value: '2024-06-10' },
    })
    fireEvent.change(screen.getByLabelText(/fecha de fin/i), {
      target: { value: '2024-06-01' },
    })
    // "En progreso" (valor por defecto del `Select`, Fase 4.2, punto 2) es
    // suficiente acá: este test no aserta sobre `estado`.

    await user.click(
      screen.getByRole('button', { name: /crear y continuar/i }),
    )

    expect(
      await screen.findByText(
        /la fecha de fin no puede ser anterior a la de inicio/i,
      ),
    ).toBeInTheDocument()
    expect(crearMutateMock).not.toHaveBeenCalled()
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
