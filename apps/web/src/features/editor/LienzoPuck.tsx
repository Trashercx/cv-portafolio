import '@puckeditor/core/puck.css'
import {
  Puck,
  type Data,
  type Overrides,
  type PuckAction,
  type UiState,
} from '@puckeditor/core'
import { Eye, EyeOff } from 'lucide-react'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { puckConfig, type PuckSeccionesComponents } from '@/lib/puck-config'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import type { MetadataEditor } from './useDatosEditor'
import { PanelAjustesFondo } from './PanelAjustesFondo'
import { PUCK_DICCIONARIO } from './puck-diccionario'
import { PUCK_UI_INICIAL, PUCK_VIEWPORTS } from './puck-viewports'
import { PLUGINS_EDITOR, PLUGIN_FONDO } from './plugins-editor'
import { esAtajoVistaLimpia } from './atajos'
import { usePuckEditor } from './usePuckEditor'

type EditorData = Data<PuckSeccionesComponents>

type LienzoPuckProps = {
  data: EditorData
  metadata: MetadataEditor | undefined
  /** Fuerza el remount de `<Puck>` (misma `key` que ya usaba `EditorSeccionesPage`). */
  editorKey: number
  onChange: (data: EditorData) => void
  /**
   * Acciones del toolbar (Borrador/Publicado, Vista previa, Historial,
   * Publicar, Guardar) — ver `EditorSeccionesPage`. Se montan en
   * `overrides.headerActions` del header nativo de Puck.
   */
  toolbar: ReactNode
  /**
   * Se invoca con cada acción de Puck que MODIFICA datos (insertar, mover,
   * editar props, duplicar, eliminar, reordenar): alimenta el indicador de
   * cambios sin guardar de `EditorSeccionesPage` (Fase 7, UC-08). Las
   * acciones de UI (`setUi`: plugin, viewport, selección) y la carga inicial
   * (`set`) no cuentan.
   */
  onCambio?: () => void
}

/** Acciones de Puck que cambian `data` (ver `PuckAction` en el `.d.ts` del paquete). */
const ACCIONES_QUE_EDITAN: ReadonlySet<PuckAction['type']> = new Set([
  'insert',
  'move',
  'reorder',
  'replace',
  'replaceRoot',
  'remove',
  'duplicate',
  'setData',
])

/**
 * El toolbar viaja por contexto y no como closure de `overrides.headerActions`
 * (Fase 7, UC-07): Puck usa ese override como COMPONENTE, así que una
 * función nueva en cada render remontaría todo el subárbol (el bug original
 * de `DialogVistaPrevia`, ver su comentario de cabecera). `AccionesCabecera`
 * es una constante de módulo (identidad estable) que solo lee el contexto.
 */
const ContextoToolbar = createContext<ReactNode>(null)

/**
 * Registra en `useEditorPanelStore` el plugin activo del rail de Puck para
 * recordarlo cuando `<Puck>` se remonta tras guardar (`editorKey`). Vive
 * dentro del header porque es lo único fuera de `children` que siempre está
 * montado dentro del contexto de Puck.
 */
function SincronizadorPlugin() {
  const plugin = usePuckEditor((state) => state.appState.ui.plugin?.current)
  const setPluginActivo = useEditorPanelStore((state) => state.setPluginActivo)
  useEffect(() => {
    if (plugin) setPluginActivo(plugin)
  }, [plugin, setPluginActivo])

  // Viewport actual (Fase 7, UC-07): mismo motivo que el plugin.
  const ancho = usePuckEditor((state) => state.appState.ui.viewports?.current?.width)
  const alto = usePuckEditor((state) => state.appState.ui.viewports?.current?.height)
  const setViewportActual = useEditorPanelStore((state) => state.setViewportActual)
  useEffect(() => {
    if (typeof ancho === 'number') {
      setViewportActual({ width: ancho, height: alto ?? 'auto' })
    }
  }, [ancho, alto, setViewportActual])

  // Fase 7l (UC-15): en Puck 0.23 seleccionar un bloque NO cambia `ui.plugin.current`
  // (el panel derecho "Campos" es independiente del rail), así que `setPluginActivo`
  // no limpia nada. Al detectar una selección se descarta el fondo elegido y el
  // fondo en curso, y el lienzo vuelve al fondo guardado.
  const hayBloqueSeleccionado = usePuckEditor((state) =>
    Boolean(state.appState.ui.itemSelector),
  )
  useEffect(() => {
    if (!hayBloqueSeleccionado) return
    const { fondoSeleccionado, setFondoSeleccionado, setFondoEnEdicion } =
      useEditorPanelStore.getState()
    if (fondoSeleccionado) setFondoSeleccionado(null)
    setFondoEnEdicion(null)
  }, [hayBloqueSeleccionado])

  // Revisión 7l: al pulsar una tarjeta de fondo con un bloque todavía
  // seleccionado, se deselecciona el bloque para que el panel derecho pase a
  // mostrar los ajustes del fondo (si no, quedarían ocultos tras los campos).
  const fondoSeleccionado = useEditorPanelStore((state) => state.fondoSeleccionado)
  const dispatchSeleccion = usePuckEditor((state) => state.dispatch)
  useEffect(() => {
    if (fondoSeleccionado && hayBloqueSeleccionado) {
      dispatchSeleccion({ type: 'setUi', ui: { itemSelector: null } })
    }
    // Solo reacciona al cambio de fondo elegido: la selección de bloque ya
    // tiene su propio efecto arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fondoSeleccionado])
  return null
}

/**
 * Traduce `vistaLimpia` (store) a `ui.previewMode` de Puck 0.23 (Fase 7c,
 * UC-07): activa = `'interactive'` (sin overlays ni recuadros al pasar el
 * puntero o seleccionar), desactiva = `'edit'`. Solo despacha si el modo
 * actual difiere, y también tras un remount de `<Puck>` (que arranca en
 * `'edit'`) para recuperar el estado. Vive dentro del header porque necesita
 * el contexto de Puck.
 */
function SincronizadorVistaLimpia() {
  const vistaLimpia = useEditorPanelStore((state) => state.vistaLimpia)
  const dispatch = usePuckEditor((state) => state.dispatch)
  const previewMode = usePuckEditor((state) => state.appState.ui.previewMode)
  useEffect(() => {
    const deseado = vistaLimpia ? 'interactive' : 'edit'
    if (previewMode !== deseado) {
      dispatch({ type: 'setUi', ui: { previewMode: deseado } })
    }
  }, [vistaLimpia, previewMode, dispatch])
  return null
}

/** Botón-toggle "Vista limpia" del toolbar (Fase 7c, UC-07). */
function BotonVistaLimpia() {
  const vistaLimpia = useEditorPanelStore((state) => state.vistaLimpia)
  const alternar = useEditorPanelStore((state) => state.alternarVistaLimpia)
  const Icono = vistaLimpia ? EyeOff : Eye
  return (
    <Button
      type="button"
      variant={vistaLimpia ? 'secondary' : 'outline'}
      size="sm"
      aria-pressed={vistaLimpia}
      title="Vista limpia: ver el sitio sin recuadros del editor (Ctrl+Shift+L)"
      onClick={alternar}
    >
      <Icono className="size-4" aria-hidden="true" />
      Vista limpia
    </Button>
  )
}

/**
 * `overrides.headerActions` (Fase 7, UC-07): reemplaza los `children` por
 * defecto de Puck (su botón "Publicar", que aquí sería ambiguo con el
 * "Publicar" real de UC-11) por el toolbar propio, que ya incluye "Guardar
 * cambios". Deshacer/rehacer los pinta el `MenuBar` nativo.
 */
function AccionesCabecera() {
  const toolbar = useContext(ContextoToolbar)
  return (
    <>
      <SincronizadorPlugin />
      <SincronizadorVistaLimpia />
      <BotonVistaLimpia />
      {toolbar}
    </>
  )
}

/**
 * `overrides.fields` (Fase 7, UC-07; ajustes de fondo en la Fase 7l, UC-15):
 * - Con un bloque seleccionado se renderizan sus campos tal cual (y
 *   `SincronizadorPlugin` ya descartó el fondo elegido).
 * - Sin bloque y con el plugin `fondo` activo: si hay `fondoSeleccionado` se
 *   muestran sus ajustes (`PanelAjustesFondo`, también con Vista limpia, que no
 *   afecta al fondo); si no, "Elige un fondo en la galería".
 * - Sin bloque en otro plugin, Puck mostraría los campos de la raíz de la
 *   página (un `title` que no se guarda en ningún lado): en su lugar va la
 *   guía que tenía `PanelBloqueSeleccionado`. Con Vista limpia (Fase 7c) no hay
 *   selección posible y se avisa de ello.
 */
export function CamposBloque({
  children,
  itemSelector,
}: {
  children: ReactNode
  itemSelector?: unknown
}) {
  const vistaLimpia = useEditorPanelStore((state) => state.vistaLimpia)
  const pluginActivo = useEditorPanelStore((state) => state.pluginActivo)
  const fondoSeleccionado = useEditorPanelStore((state) => state.fondoSeleccionado)
  const enPluginFondo = pluginActivo === PLUGIN_FONDO
  if (!itemSelector && enPluginFondo && fondoSeleccionado) {
    return <PanelAjustesFondo />
  }
  if (vistaLimpia) {
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        Vista limpia: desactívala para seleccionar bloques
      </p>
    )
  }
  if (!itemSelector) {
    if (enPluginFondo) {
      return (
        <p className="p-4 text-sm text-muted-foreground">
          Elige un fondo en la galería para ajustarlo aquí.
        </p>
      )
    }
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Selecciona un bloque en el lienzo, o arrastra uno nuevo desde
        &quot;Bloques&quot;.
      </p>
    )
  }
  return <>{children}</>
}

const OVERRIDES_EDITOR: Partial<Overrides<typeof puckConfig>> = {
  headerActions: AccionesCabecera,
  fields: CamposBloque,
}

/**
 * Lienzo del editor unificado con el layout NATIVO de Puck 0.23 (Fase 7,
 * UC-07/UC-08): rail de plugins (Bloques, Esquema, Campos + Tema y Fondo
 * propios, ver `plugins-editor.tsx`), selector de viewport nativo, header con
 * deshacer/rehacer y outline arrastrable. Sustituye el layout manual de
 * Fase 5 (`Puck.Components`/`Puck.Outline`/`Puck.Preview` en columnas fijas)
 * y a `PanelLateralEditor`/`PanelBloqueSeleccionado`/`ViewportSwitcher`: el
 * plugin `fields` ya muestra el label del bloque seleccionado (breadcrumbs).
 * En móvil el rail pasa abajo, comportamiento nativo de Puck.
 *
 * `height="100%"`: el contenedor de `EditorSeccionesPage` ya descuenta el
 * header del admin y el banner de borrador, así que Puck rellena ese alto
 * en vez de su `100dvh` por defecto.
 */
export function LienzoPuck({
  data,
  metadata,
  editorKey,
  onChange,
  toolbar,
  onCambio,
}: LienzoPuckProps) {
  // Se lee en render (no con hook reactivo): solo importa el valor al montar
  // `<Puck>` (`?panel=` o plugin previo antes de un remount por guardado).
  // Vista limpia (Fase 7c, UC-07): atajo `Ctrl/Cmd+Shift+L` con el foco en el
  // panel (dentro del iframe lo captura `PuckRoot`) y apagado al salir del editor.
  useEffect(() => {
    const alPresionar = (event: KeyboardEvent) => {
      if (!esAtajoVistaLimpia(event)) return
      event.preventDefault()
      useEditorPanelStore.getState().alternarVistaLimpia()
    }
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      useEditorPanelStore.getState().setVistaLimpia(false)
    }
  }, [])

  const { pluginActivo: pluginInicial, viewportActual } =
    useEditorPanelStore.getState()
  const uiInicial: Partial<UiState> = {
    ...PUCK_UI_INICIAL,
    plugin: { current: pluginInicial },
    ...(viewportActual && PUCK_UI_INICIAL.viewports
      ? { viewports: { ...PUCK_UI_INICIAL.viewports, current: viewportActual } }
      : {}),
  }

  return (
    <ContextoToolbar.Provider value={toolbar}>
      <div className="h-full scrollbar-fina">
        <Puck
          key={editorKey}
          config={puckConfig}
          data={data}
          metadata={metadata}
          viewports={PUCK_VIEWPORTS}
          ui={uiInicial}
          plugins={PLUGINS_EDITOR}
          overrides={OVERRIDES_EDITOR}
          dictionary={PUCK_DICCIONARIO}
          headerTitle="Editor visual"
          height="100%"
          iframe={{ enabled: true, waitForStyles: true, syncHostStyles: true }}
          onChange={onChange}
          onAction={(action) => {
            if (ACCIONES_QUE_EDITAN.has(action.type)) onCambio?.()
          }}
        />
      </div>
    </ContextoToolbar.Provider>
  )
}
