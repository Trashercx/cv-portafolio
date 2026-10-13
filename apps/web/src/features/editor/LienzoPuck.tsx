import '@puckeditor/core/puck.css'
import {
  Puck,
  type Data,
  type Overrides,
  type PuckAction,
} from '@puckeditor/core'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { puckConfig, type PuckSeccionesComponents } from '@/lib/puck-config'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import type { MetadataEditor } from './useDatosEditor'
import { PUCK_DICCIONARIO } from './puck-diccionario'
import { PUCK_UI_INICIAL, PUCK_VIEWPORTS } from './puck-viewports'
import { PLUGINS_EDITOR } from './plugins-editor'
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
  return null
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
      {toolbar}
    </>
  )
}

const OVERRIDES_EDITOR: Partial<Overrides<typeof puckConfig>> = {
  headerActions: AccionesCabecera,
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
  const pluginInicial = useEditorPanelStore.getState().pluginActivo

  return (
    <ContextoToolbar.Provider value={toolbar}>
      <div className="h-full scrollbar-fina">
        <Puck
          key={editorKey}
          config={puckConfig}
          data={data}
          metadata={metadata}
          viewports={PUCK_VIEWPORTS}
          ui={{ ...PUCK_UI_INICIAL, plugin: { current: pluginInicial } }}
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
