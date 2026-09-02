import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Seccion } from '@/features/secciones/types'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import { EditorSeccionesPage } from './EditorSeccionesPage'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderEditor() {
  return render(
    <MemoryRouter>
      <EditorSeccionesPage />
    </MemoryRouter>,
  )
}

/**
 * Montar un `<Puck>` real (drag-and-drop, DnD backend, portales) en jsdom es
 * frágil y no aporta valor de regresión aquí — se documenta como decisión
 * consciente (ver también `docs/plan-tecnico.md` sección "Sprint 3":
 * "no automatizar el drag-and-drop pixel a pixel"). En su lugar se stubea
 * `Puck` y se ejercita la lógica de sincronización de
 * `EditorSeccionesPage` inyectando directamente un `content` simulado en
 * el store de Zustand que alimenta el botón "Guardar cambios".
 */
vi.mock('@measured/puck', () => ({
  Puck: () => null,
}))

const SECCION_HERO: Seccion = {
  id: 'seccion-a',
  usuario_admin_id: 'admin-1',
  tipo_seccion: 'hero',
  titulo_visible: 'Portada',
  orden: 0,
  visible: true,
  configuracion: { titulo: 'A', subtitulo: 'B' },
}

const SECCION_CONTACTO: Seccion = {
  id: 'seccion-b',
  usuario_admin_id: 'admin-1',
  tipo_seccion: 'contacto',
  titulo_visible: 'Contacto',
  orden: 1,
  visible: true,
  configuracion: { mostrar_formulario: false },
}

const crearMutateAsyncMock = vi.fn()
const actualizarMutateAsyncMock = vi.fn()
const actualizarConfiguracionMutateAsyncMock = vi.fn()
const actualizarVisibilidadMutateAsyncMock = vi.fn()
const eliminarMutateAsyncMock = vi.fn()
const reordenarMutateAsyncMock = vi.fn()

vi.mock('@/features/secciones/useSecciones', () => ({
  useSecciones: () => ({
    data: [SECCION_HERO, SECCION_CONTACTO],
    isLoading: false,
    error: null,
  }),
  useCrearSeccion: () => ({ mutateAsync: crearMutateAsyncMock }),
  useActualizarSeccion: () => ({ mutateAsync: actualizarMutateAsyncMock }),
  useActualizarConfiguracionSeccion: () => ({
    mutateAsync: actualizarConfiguracionMutateAsyncMock,
  }),
  useActualizarVisibilidadSeccion: () => ({
    mutateAsync: actualizarVisibilidadMutateAsyncMock,
  }),
  useEliminarSeccion: () => ({ mutateAsync: eliminarMutateAsyncMock }),
  useReordenarSecciones: () => ({ mutateAsync: reordenarMutateAsyncMock }),
}))

describe('EditorSeccionesPage (UC-07)', () => {
  beforeEach(() => {
    useEditorSeccionesStore.setState({ content: [] })
    crearMutateAsyncMock.mockResolvedValue({ id: 'seccion-c' })
    actualizarMutateAsyncMock.mockResolvedValue(undefined)
    actualizarConfiguracionMutateAsyncMock.mockResolvedValue(undefined)
    actualizarVisibilidadMutateAsyncMock.mockResolvedValue(undefined)
    eliminarMutateAsyncMock.mockResolvedValue(undefined)
    reordenarMutateAsyncMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('carga las secciones existentes en el store de edición al montar', async () => {
    renderEditor()

    await waitFor(() =>
      expect(useEditorSeccionesStore.getState().content).toHaveLength(2),
    )
    const [primero, segundo] = useEditorSeccionesStore.getState().content
    expect(primero.type).toBe('hero')
    expect(segundo.type).toBe('contacto')
  })

  it('"Guardar cambios" crea, actualiza, elimina y reordena según el content simulado', async () => {
    const user = userEvent.setup()
    renderEditor()

    await waitFor(() =>
      expect(useEditorSeccionesStore.getState().content).toHaveLength(2),
    )

    // Simula lo que haría Puck vía `onChange` tras la edición del admin:
    // - la portada (A) se mantiene pero cambia su `subtitulo`.
    // - el bloque de contacto (B) se arrastró fuera del lienzo (se borra).
    // - se agregó un bloque nuevo de logros, todavía sin `_seccionId`.
    act(() => {
      useEditorSeccionesStore.getState().setContent([
        {
          type: 'hero',
          props: {
            id: 'seccion-a',
            _seccionId: 'seccion-a',
            _visible: true,
            _tituloVisible: 'Portada',
            titulo: 'A',
            subtitulo: 'B2',
          },
        },
        {
          type: 'logros',
          props: {
            id: 'c-temp',
            _visible: true,
            _tituloVisible: 'Logros',
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any)
    })

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() =>
      expect(reordenarMutateAsyncMock).toHaveBeenCalledTimes(1),
    )

    expect(actualizarConfiguracionMutateAsyncMock).toHaveBeenCalledWith({
      id: 'seccion-a',
      configuracion: { titulo: 'A', subtitulo: 'B2' },
    })
    expect(actualizarMutateAsyncMock).not.toHaveBeenCalled()
    expect(actualizarVisibilidadMutateAsyncMock).not.toHaveBeenCalled()

    expect(crearMutateAsyncMock).toHaveBeenCalledWith({
      tipo_seccion: 'logros',
      titulo_visible: 'Logros',
      orden: 1,
      visible: true,
      configuracion: {},
    })

    expect(eliminarMutateAsyncMock).toHaveBeenCalledWith('seccion-b')

    expect(reordenarMutateAsyncMock).toHaveBeenCalledWith([
      { id: 'seccion-a', orden: 0 },
      { id: 'seccion-c', orden: 1 },
    ])

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Cambios guardados correctamente.',
      ),
    )
  })

  it('bloquea la edición (queda `inert`) mientras "Guardar cambios" está en curso, y la desbloquea al terminar', async () => {
    const user = userEvent.setup()

    // Difiere la resolución de `crearSeccion` para poder observar el estado
    // "guardando" a mitad del guardado, tal como hace el resto del archivo
    // con timing controlado.
    let resolverCreacion!: (valor: { id: string }) => void
    crearMutateAsyncMock.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolverCreacion = resolve
      }),
    )

    renderEditor()

    await waitFor(() =>
      expect(useEditorSeccionesStore.getState().content).toHaveLength(2),
    )

    // Agrega un bloque nuevo (sin `_seccionId`) para forzar que
    // `guardarCambios` quede esperando la promesa de `crearSeccion`.
    act(() => {
      useEditorSeccionesStore.getState().setContent([
        ...useEditorSeccionesStore.getState().content,
        {
          type: 'logros',
          props: { id: 'c-temp', _visible: true, _tituloVisible: 'Logros' },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any)
    })

    const wrapper = screen.getByTestId('puck-editor-wrapper')
    expect(wrapper).not.toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    // Mientras la promesa de `crearSeccion` sigue pendiente, el editor debe
    // quedar bloqueado a interacción (mouse/teclado) para que sea imposible
    // seguir editando y perder esos cambios al terminar el guardado.
    await waitFor(() => expect(wrapper).toHaveAttribute('inert'))
    expect(
      screen.getByText(/edición está bloqueada temporalmente/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /guardando/i }),
    ).toBeDisabled()

    act(() => {
      resolverCreacion({ id: 'seccion-c' })
    })

    await waitFor(() => expect(wrapper).not.toHaveAttribute('inert'))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Cambios guardados correctamente.',
      ),
    )
  })

  it('un segundo "Guardar cambios" inmediatamente después del primero no reintenta crear/eliminar lo ya persistido (condición de carrera con el cache de la query)', async () => {
    const user = userEvent.setup()
    renderEditor()

    await waitFor(() =>
      expect(useEditorSeccionesStore.getState().content).toHaveLength(2),
    )

    // Igual que en el test anterior: se borra "Contacto" y se agrega un
    // bloque nuevo de logros todavía sin `_seccionId`.
    act(() => {
      useEditorSeccionesStore.getState().setContent([
        {
          type: 'hero',
          props: {
            id: 'seccion-a',
            _seccionId: 'seccion-a',
            _visible: true,
            _tituloVisible: 'Portada',
            titulo: 'A',
            subtitulo: 'B',
          },
        },
        {
          type: 'logros',
          props: { id: 'c-temp', _visible: true, _tituloVisible: 'Logros' },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any)
    })

    const boton = screen.getByRole('button', { name: /guardar cambios/i })
    await user.click(boton)

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /guardar cambios/i }),
      ).not.toBeDisabled(),
    )

    // Nótese que `useSecciones` está mockeado para devolver siempre las 2
    // secciones originales — igual que le pasaría al cache real de
    // TanStack Query si el usuario guarda de nuevo antes de que termine el
    // refetch disparado por `invalidateQueries`. Con la corrección, el
    // diff del segundo guardado debe basarse en lo realmente persistido
    // (el `ref` actualizado tras el primer guardado), no en ese cache
    // desactualizado.
    await user.click(boton)

    await waitFor(() =>
      expect(reordenarMutateAsyncMock).toHaveBeenCalledTimes(2),
    )

    // "Contacto" (seccion-b) y la creación de "Logros" solo debieron
    // ocurrir una vez, en el primer guardado — no deben repetirse ni
    // fallar en el segundo.
    expect(eliminarMutateAsyncMock).toHaveBeenCalledTimes(1)
    expect(eliminarMutateAsyncMock).toHaveBeenCalledWith('seccion-b')
    expect(crearMutateAsyncMock).toHaveBeenCalledTimes(1)

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Cambios guardados correctamente.',
      ),
    )
  })

  it('si una sub-mutación falla, "Guardar cambios" no muestra su propio toast.error (deja esa responsabilidad al MutationCache global) y conserva lo ya creado', async () => {
    const user = userEvent.setup()
    // Cada `mutateAsync` de `useSecciones` es un `useMutation` real y por lo
    // tanto ya pasa por el `MutationCache.onError` global de
    // `query-client.ts` (no mockeado aquí), que SIEMPRE muestra su propio
    // `toast.error`. Este test verifica que `EditorSeccionesPage` ya NO
    // duplica ese toast localmente en su `catch` — solo se prueba la mitad
    // "local" del fix; la otra mitad (que el toast global sigue
    // disparándose) no cambió y no se tocó en este sprint.
    actualizarConfiguracionMutateAsyncMock.mockRejectedValue(
      new Error('fallo de red simulado'),
    )

    renderEditor()

    await waitFor(() =>
      expect(useEditorSeccionesStore.getState().content).toHaveLength(2),
    )

    act(() => {
      useEditorSeccionesStore.getState().setContent([
        {
          type: 'hero',
          props: {
            id: 'seccion-a',
            _seccionId: 'seccion-a',
            _visible: true,
            _tituloVisible: 'Portada',
            titulo: 'A',
            subtitulo: 'B2',
          },
        },
        {
          type: 'contacto',
          props: {
            id: 'seccion-b',
            _seccionId: 'seccion-b',
            _visible: true,
            _tituloVisible: 'Contacto',
            mostrar_formulario: false,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any)
    })

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() =>
      expect(actualizarConfiguracionMutateAsyncMock).toHaveBeenCalled(),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /guardar cambios/i }),
      ).not.toBeDisabled(),
    )

    // No debe haber ni un solo toast disparado por `EditorSeccionesPage`
    // mismo: el de éxito no aplica porque falló, y el de error ya no vive
    // en este componente.
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    // No debió llegar a reordenar tras el fallo previo en la fase de diff.
    expect(reordenarMutateAsyncMock).not.toHaveBeenCalled()
  })
})
