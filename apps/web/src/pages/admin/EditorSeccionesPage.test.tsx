import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Seccion } from '@/features/secciones/types'
import type { SnapshotSitio } from '@/features/publico/types'
import type { VersionSitio } from '@/features/publicacion/types'
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
 *
 * Desde Fase 3.1 la barra de acciones propia (Borrador/Publicado, Vista
 * previa, Historial de versiones, Publicar, Guardar cambios) vive dentro del
 * header nativo de Puck vía `overrides.headerActions` en vez de un `<div>`
 * separado encima del lienzo — el stub debe seguir invocándola para que
 * estos elementos sigan siendo consultables por rol/nombre en los tests de
 * abajo, igual que antes de la migración.
 *
 * `headerActions` se usa acá como REFERENCIA DE COMPONENTE (`<HeaderActions />`),
 * no como una llamada directa (`headerActions()`): así reproduce el mismo
 * comportamiento del `Puck` real (confirmado leyendo
 * `node_modules/@measured/puck/dist/index.js`, donde `CustomHeaderActions`
 * también se usa como tipo de componente JSX) — una función/objeto literal
 * nuevo en cada render de `EditorSeccionesPage` (la prop `overrides` se
 * declara inline) hace que React remonte todo ese subárbol. Es justo lo que
 * necesita el test de "Vista previa no se cierra sola" más abajo (Fase 4.1,
 * punto 2) para poder detectar una regresión si el estado de
 * `DialogVistaPrevia` volviera a vivir dentro de ese subárbol en vez de en
 * `EditorSeccionesPage`.
 */
vi.mock('@measured/puck', () => ({
  Puck: (props: { overrides?: { headerActions?: () => ReactNode } }) => {
    const HeaderActions = props.overrides?.headerActions
    return HeaderActions ? <HeaderActions /> : null
  },
}))

const SECCION_HERO: Seccion = {
  id: 'seccion-a',
  usuario_admin_id: 'admin-1',
  tipo_seccion: 'hero',
  titulo_visible: 'Portada',
  orden: 0,
  visible: true,
  configuracion: {
    titulo: 'A',
    subtitulo: 'B',
    mostrar_foto_perfil: false,
    posicion_foto: 'ninguna',
    estilo_foto: 'con_marco',
  },
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

/**
 * Mutable para poder variar `useSecciones().data` por test (p. ej. simular
 * una sección `hero` legada), mismo patrón que `publicacionMocks` más abajo
 * en este archivo.
 */
const seccionesMock: { data: Seccion[] } = {
  data: [SECCION_HERO, SECCION_CONTACTO],
}

/**
 * `useDatosEditor` (Fase 3.1) compone 9 hooks reales de TanStack Query
 * (`usePerfil`, `useProyectos`, etc.) para alimentar el lienzo con el
 * contenido real del sitio — montarlos de verdad exigiría envolver el
 * render en un `QueryClientProvider` y mockear cada endpoint por separado,
 * sin aportar ninguna cobertura nueva sobre lo que este archivo ya prueba
 * (la sincronización de `guardarCambios`). Se mockea entero, como documenta
 * `docs/plan-tecnico.md` sección "Fase 3.1".
 */
vi.mock('@/features/editor/useDatosEditor', () => ({
  useDatosEditor: () => ({
    datos: {
      perfil: null,
      tema: null,
      proyectos: [],
      certificaciones: [],
      logros: [],
      redes_sociales: [],
      skills: [],
      fondo: null,
      mediaPorId: new Map(),
    },
    isLoading: false,
    error: null,
  }),
  leerMetadata: () => ({
    datos: {
      perfil: null,
      tema: null,
      proyectos: [],
      certificaciones: [],
      logros: [],
      redes_sociales: [],
      skills: [],
      fondo: null,
      mediaPorId: new Map(),
    },
  }),
}))

vi.mock('@/features/secciones/useSecciones', () => ({
  useSecciones: () => ({
    data: seccionesMock.data,
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

// Fixtures y mocks de UC-10/UC-11 (Previsualizar/Publicar/Revertir), fusionados
// en esta página desde Sprint 7 (ver `docs` de `EditorSeccionesPage` y
// `PanelVersiones`). Migrados desde el extinto `PublicacionPage.test.tsx`.
const SNAPSHOT_VACIO: SnapshotSitio = {
  perfil: null,
  tema: null,
  secciones: [
    {
      id: 'seccion-hero',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'hero',
      titulo_visible: 'Portada',
      orden: 0,
      visible: true,
      configuracion: {
        titulo: 'Hola',
        subtitulo: 'Mundo',
        mostrar_foto_perfil: false,
        posicion_foto: 'ninguna',
        estilo_foto: 'con_marco',
      },
    },
    {
      id: 'seccion-contacto',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'contacto',
      titulo_visible: 'Contacto oculto',
      orden: 1,
      visible: false,
      configuracion: { mostrar_formulario: false },
    },
  ],
  proyectos: [],
  certificaciones: [],
  logros: [],
  redes_sociales: [],
  skills: [],
  fondo: null,
}

const VERSION_PREVIEW: VersionSitio = {
  id: 'preview-1',
  usuario_admin_id: 'admin-1',
  estado: 'borrador',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: null,
}

const VERSION_ACTUAL: VersionSitio = {
  id: 'v3',
  usuario_admin_id: 'admin-1',
  estado: 'publicado',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: '2026-02-01T00:00:00.000Z',
}

const VERSION_ANTERIOR: VersionSitio = {
  id: 'v2',
  usuario_admin_id: 'admin-1',
  estado: 'publicado',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: '2026-01-01T00:00:00.000Z',
}

const VERSION_BORRADOR: VersionSitio = {
  id: 'v1',
  usuario_admin_id: 'admin-1',
  estado: 'borrador',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: null,
}

/**
 * Publicada más vieja que `VERSION_ANTERIOR`: en el historial
 * V0 < V2 < V3(actual), NO debe ofrecer "Deshacer última publicación" — solo
 * V2 (la inmediatamente anterior a la actual) puede. Migrado desde el
 * extinto `PublicacionPage.test.tsx` (ver comentario en el test que la usa).
 */
const VERSION_MAS_ANTIGUA_PUBLICADA: VersionSitio = {
  id: 'v0',
  usuario_admin_id: 'admin-1',
  estado: 'publicado',
  snapshot: SNAPSHOT_VACIO,
  publicado_en: '2025-12-01T00:00:00.000Z',
}

const previewMutateMock = vi.fn()
const publicarMutateMock = vi.fn()
const revertirMutateMock = vi.fn()

const publicacionMocks: {
  versiones: VersionSitio[]
  versionesIsLoading: boolean
  versionesIsSuccess: boolean
  previewPending: boolean
  publicarPending: boolean
  revertirPending: boolean
} = {
  versiones: [VERSION_ACTUAL, VERSION_ANTERIOR],
  versionesIsLoading: false,
  versionesIsSuccess: true,
  previewPending: false,
  publicarPending: false,
  revertirPending: false,
}

vi.mock('@/features/publicacion/usePublicacion', () => ({
  useVersiones: () => ({
    data: publicacionMocks.versiones,
    isLoading: publicacionMocks.versionesIsLoading,
    isSuccess: publicacionMocks.versionesIsSuccess,
    error: null,
  }),
  usePreviewVersion: () => ({
    mutate: previewMutateMock,
    isPending: publicacionMocks.previewPending,
  }),
  usePublicarVersion: () => ({
    mutate: publicarMutateMock,
    isPending: publicacionMocks.publicarPending,
  }),
  useRevertirVersion: () => ({
    mutate: revertirMutateMock,
    isPending: publicacionMocks.revertirPending,
  }),
}))

describe('EditorSeccionesPage (UC-07, UC-10, UC-11)', () => {
  beforeEach(() => {
    useEditorSeccionesStore.setState({ content: [] })
    seccionesMock.data = [SECCION_HERO, SECCION_CONTACTO]
    crearMutateAsyncMock.mockResolvedValue({ id: 'seccion-c' })
    actualizarMutateAsyncMock.mockResolvedValue(undefined)
    actualizarConfiguracionMutateAsyncMock.mockResolvedValue(undefined)
    actualizarVisibilidadMutateAsyncMock.mockResolvedValue(undefined)
    eliminarMutateAsyncMock.mockResolvedValue(undefined)
    reordenarMutateAsyncMock.mockResolvedValue(undefined)

    publicacionMocks.versiones = [VERSION_ACTUAL, VERSION_ANTERIOR]
    publicacionMocks.versionesIsLoading = false
    publicacionMocks.versionesIsSuccess = true
    publicacionMocks.previewPending = false
    publicacionMocks.publicarPending = false
    publicacionMocks.revertirPending = false
    previewMutateMock.mockImplementation((_vars, options) => {
      options?.onSuccess?.(VERSION_PREVIEW)
    })
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

  it('una sección hero legada (sin mostrar_foto_perfil/posicion_foto/estilo_foto guardados) carga el content inicial con el fallback conservador, no con el default de creación', async () => {
    const SECCION_HERO_LEGADA: Seccion = {
      id: 'seccion-legada',
      usuario_admin_id: 'admin-1',
      tipo_seccion: 'hero',
      titulo_visible: 'Portada',
      orden: 0,
      visible: true,
      // Datos legados: guardados antes de agregar estos 3 campos al DTO de
      // `hero` (ahora opcionales en `HeroConfiguracion`, ver su comentario).
      configuracion: { titulo: 'A', subtitulo: 'B' },
    }
    seccionesMock.data = [SECCION_HERO_LEGADA]

    renderEditor()

    await waitFor(() =>
      expect(useEditorSeccionesStore.getState().content).toHaveLength(1),
    )

    const [heroContent] = useEditorSeccionesStore.getState().content
    // El default de "creación" del bloque (`puckConfig.components.hero.defaultProps`)
    // es `mostrar_foto_perfil: true, posicion_foto: 'centrada'` — si el editor
    // lo reutilizara para rellenar datos legados, guardar cualquier cambio
    // fijaría una foto visible en el sitio público sin que el admin lo haya
    // elegido. El content inicial debe traer en cambio el fallback
    // conservador (sin foto), que preserva el comportamiento que la sección
    // ya tenía.
    expect(heroContent.props).toMatchObject({
      mostrar_foto_perfil: false,
      posicion_foto: 'ninguna',
      estilo_foto: 'con_marco',
    })
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
    // `hidden: true`: mientras `guardando` es `true`, este botón vive dentro
    // del wrapper `inert` (Fase 3.1 lo movió a `overrides.headerActions`,
    // adentro de `<Puck>`) — `inert` lo saca del árbol de accesibilidad, así
    // que hay que pedir explícitamente los elementos "ocultos" para seguir
    // pudiendo consultarlo por rol.
    expect(
      screen.getByRole('button', { name: /guardando/i, hidden: true }),
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
    //
    // Se vuelve a consultar el botón (no se reutiliza `boton`): tras un
    // guardado exitoso `EditorSeccionesPage` remonta `<Puck key={editorKey}>`
    // completo, y desde Fase 3.1 la barra de acciones vive dentro de ese
    // árbol (`overrides.headerActions`) — el nodo DOM original queda
    // desmontado, igual que le pasaría a cualquier referencia guardada de
    // antemano, no solo a la de este test.
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

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

  it('muestra el badge "Publicado" cuando la versión más reciente ya fue publicada, sin el banner de cambios sin publicar', async () => {
    renderEditor()

    expect(await screen.findByText('Publicado')).toBeInTheDocument()
    expect(screen.queryByText('Borrador')).not.toBeInTheDocument()
    // Fase 4.1, punto 6: el banner solo se muestra cuando hay cambios sin
    // publicar, no cuando la última versión ya es la publicada.
    expect(
      screen.queryByText(/todavía no publicaste/i),
    ).not.toBeInTheDocument()
  })

  it('muestra el badge "Borrador" y el banner de cambios sin publicar cuando la versión más reciente todavía no se publicó', async () => {
    publicacionMocks.versiones = [
      VERSION_PREVIEW,
      VERSION_ACTUAL,
      VERSION_ANTERIOR,
    ]
    renderEditor()

    expect(await screen.findByText('Borrador')).toBeInTheDocument()
    // Fase 4.1, punto 6: refuerzo visual más notorio que el badge chico,
    // para que "no veo el cambio en `/`" se entienda como "todavía no
    // publicaste", no como un bug.
    expect(
      screen.getByText(/todavía no publicaste/i),
    ).toBeInTheDocument()
  })

  it('no muestra el badge "Publicado" mientras el historial de versiones todavía está cargando', () => {
    publicacionMocks.versionesIsLoading = true
    publicacionMocks.versionesIsSuccess = false
    renderEditor()

    expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  })

  it('no muestra el badge "Publicado" cuando todavía no existe ninguna versión (sitio nuevo, nunca publicado ni previsualizado)', async () => {
    publicacionMocks.versiones = []
    renderEditor()

    // Sin ninguna versión todavía no hay nada público que mostrar como
    // "Publicado": se trata como "Borrador" (ver comentario en
    // `EditorSeccionesPage` sobre `hayCambiosSinPublicar`).
    expect(await screen.findByText('Borrador')).toBeInTheDocument()
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  })

  it('"Publicar" pide confirmación antes de llamar a la mutación', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: /^publicar$/i }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(
      within(dialogo).getByText(/publicar los cambios actuales/i),
    ).toBeInTheDocument()

    expect(publicarMutateMock).not.toHaveBeenCalled()

    await user.click(
      within(dialogo).getByRole('button', { name: /^publicar$/i }),
    )

    expect(publicarMutateMock).toHaveBeenCalledTimes(1)
  })

  it('"Historial de versiones" abre un diálogo con el historial completo, sin su propio botón de vista previa (Fase 4.1, punto 3: la única "Vista previa" que queda es la de la barra del editor)', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(
      screen.getByRole('button', { name: /historial de versiones/i }),
    )

    const dialogo = await screen.findByRole('dialog')
    // "Historial de versiones" aparece dos veces dentro del diálogo (el
    // título del `Dialog` y el encabezado de la sección de `PanelVersiones`),
    // así que basta con confirmar que ambas están presentes.
    expect(
      within(dialogo).getAllByText(/historial de versiones/i),
    ).toHaveLength(2)

    expect(
      within(dialogo).queryByRole('button', { name: /previsualizar cambios/i }),
    ).not.toBeInTheDocument()
  })

  it('"Vista previa" (barra del editor) abre el diálogo y genera una vista previa contra el contenido actual', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: /^vista previa$/i }))

    const dialogo = await screen.findByRole('dialog')
    expect(previewMutateMock).toHaveBeenCalled()
    // La sección visible se pinta normal, y la oculta se muestra igual pero
    // marcada como "no se publicará" (soloVisibles=false en la preview).
    expect(within(dialogo).getByText('Hola')).toBeInTheDocument()
    expect(within(dialogo).getByText('Contacto oculto')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Oculta · no se publicará'),
    ).toBeInTheDocument()
  })

  it('"Vista previa" no se cierra sola cuando el resto de la página se re-renderiza y remonta el subárbol de headerActions (Fase 4.1, punto 2: regresión del bug reportado)', async () => {
    const user = userEvent.setup()
    const { rerender } = renderEditor()

    await user.click(screen.getByRole('button', { name: /^vista previa$/i }))
    await screen.findByRole('dialog')
    expect(
      screen.getByRole('heading', { name: 'Vista previa' }),
    ).toBeInTheDocument()

    // Cualquier cambio de estado en `EditorSeccionesPage` re-crea el objeto
    // `overrides` (declarado inline en el JSX de `<Puck>`), lo que el mock
    // de `Puck` de este archivo remonta como un subárbol nuevo (mismo
    // comportamiento que el `Puck` real, ver el comentario de cabecera de
    // ese mock) — antes del fix, esto reseteaba el `useState` local de
    // `DialogVistaPrevia` a `open=false`. Se fuerza ese re-render con
    // `rerender` (en vez de interactuar con otro botón de la barra, que
    // Radix marca `aria-hidden` mientras el diálogo de Vista previa está
    // abierto) para aislar específicamente el efecto del remount.
    rerender(
      <MemoryRouter>
        <EditorSeccionesPage />
      </MemoryRouter>,
    )

    // El diálogo de "Vista previa" debe seguir abierto y con su contenido:
    // con el estado levantado a `EditorSeccionesPage` (que nunca se
    // remonta), el remount del subárbol de `headerActions` ya no lo afecta.
    expect(
      screen.getByRole('heading', { name: 'Vista previa' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Hola')).toBeInTheDocument()
  })

  it('"Deshacer última publicación" solo aparece en la publicada inmediatamente anterior a la actual, y confirma antes de revertir', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(
      screen.getByRole('button', { name: /historial de versiones/i }),
    )
    const dialogo = await screen.findByRole('dialog')

    const botonesRevertir = within(dialogo).getAllByRole('button', {
      name: /deshacer última publicación/i,
    })
    // Solo la versión "anterior" (v2) puede revertirse: la actual (v3) no
    // tiene "antes de sí misma".
    expect(botonesRevertir).toHaveLength(1)

    await user.click(botonesRevertir[0])

    const confirmacion = await screen.findByRole('alertdialog')
    await user.click(
      within(confirmacion).getByRole('button', { name: /^deshacer$/i }),
    )

    // El backend restaura la publicada INMEDIATAMENTE ANTERIOR al id que
    // recibe, así que para recuperar el contenido de v2 hay que llamar a la
    // mutación con el id de la actual (v3), no con 'v2'.
    expect(revertirMutateMock).toHaveBeenCalledWith(
      'v3',
      expect.objectContaining({ onSettled: expect.any(Function) }),
    )
  })

  it('con 3+ versiones publicadas, "Deshacer última publicación" solo aparece en la inmediatamente anterior a la actual, no en publicaciones más antiguas', async () => {
    const user = userEvent.setup()
    publicacionMocks.versiones = [
      VERSION_ACTUAL,
      VERSION_ANTERIOR,
      VERSION_MAS_ANTIGUA_PUBLICADA,
      VERSION_BORRADOR,
    ]
    renderEditor()

    await user.click(
      screen.getByRole('button', { name: /historial de versiones/i }),
    )
    const dialogo = await screen.findByRole('dialog')

    // Historial: v0 < v2 < v3(actual). Solo v2 (inmediatamente anterior a la
    // actual) puede ofrecer "deshacer última publicación" — v0, aunque
    // también publicada, es más vieja y revertir sobre su fila restauraría
    // v0 en vez de mostrar el resultado de "deshacer la última publicación";
    // v1 (borrador) tampoco es una publicación.
    const botonesRevertir = within(dialogo).getAllByRole('button', {
      name: /deshacer última publicación/i,
    })
    expect(botonesRevertir).toHaveLength(1)
  })
})
