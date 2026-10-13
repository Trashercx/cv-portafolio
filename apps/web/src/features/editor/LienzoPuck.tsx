import '@measured/puck/puck.css'
import { Puck, type Data } from '@measured/puck'
import { Redo2, Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { puckConfig, type PuckSeccionesComponents } from '@/lib/puck-config'
import type { MetadataEditor } from './useDatosEditor'
import { PanelLateralEditor } from './PanelLateralEditor'
import { PUCK_UI_INICIAL, PUCK_VIEWPORTS } from './puck-viewports'
import { usePuckEditor } from './usePuckEditor'
import { ViewportSwitcher } from './ViewportSwitcher'

type EditorData = Data<PuckSeccionesComponents>

type LienzoPuckProps = {
  data: EditorData
  metadata: MetadataEditor | undefined
  /** Fuerza el remount de `<Puck>` (misma `key` que ya usaba `EditorSeccionesPage`). */
  editorKey: number
  onChange: (data: EditorData) => void
  /** Barra de acciones propia (Borrador/Publicado, Vista previa, Historial, Publicar, Guardar) — ver `EditorSeccionesPage`. */
  toolbar: ReactNode
}

/**
 * Deshacer/rehacer (Fase 5): antes vivían en el `MenuBar` del header nativo
 * de Puck, que se pierde por completo al reemplazar `children` (ver
 * `node_modules/@measured/puck/dist/index.d.ts` — `children` reemplaza TODO
 * el layout por defecto). `usePuck(s => s.history)` expone el mismo
 * `back`/`forward`/`hasPast`/`hasFuture` que usaba ese `MenuBar`.
 */
function ControlesHistorial() {
  const history = usePuckEditor((state) => state.history)

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Deshacer"
        disabled={!history.hasPast}
        onClick={history.back}
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Rehacer"
        disabled={!history.hasFuture}
        onClick={history.forward}
      >
        <Redo2 className="size-4" />
      </Button>
    </div>
  )
}

/**
 * Lienzo del editor unificado (Fase 5, panel unificado): reemplaza el
 * `<Puck ... overrides={{ headerActions }}>` de antes por una composición
 * manual vía `children` (confirmado leyendo
 * `node_modules/@measured/puck/dist/index.d.ts`: si se pasan `children`,
 * reemplazan TODO el layout por defecto de Puck — header, sidebar izquierdo,
 * canvas, sidebar derecho — por lo que se componga acá). El portal
 * `#puck-portal-root` (overlays de drag-and-drop) y los hotkeys (Ctrl+Z,
 * etc., que corren en `PuckLayout`, no dentro de `children`) siguen
 * funcionando igual.
 *
 * `toolbar` viaja como prop (JSX ya armado por `EditorSeccionesPage`, no una
 * función/componente nuevo en cada render) en vez de `overrides.headerActions`
 * — evita el remount de ese subárbol que antes forzaba levantar el estado de
 * `DialogVistaPrevia` al padre (ver su comentario de cabecera).
 */
export function LienzoPuck({
  data,
  metadata,
  editorKey,
  onChange,
  toolbar,
}: LienzoPuckProps) {
  return (
    <Puck
      key={editorKey}
      config={puckConfig}
      data={data}
      metadata={metadata}
      viewports={PUCK_VIEWPORTS}
      ui={PUCK_UI_INICIAL}
      iframe={{ enabled: true, waitForStyles: true }}
      onChange={onChange}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
          <div className="flex items-center gap-2">
            <ControlesHistorial />
            <ViewportSwitcher />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="grid w-64 shrink-0 gap-2 overflow-y-auto border-r p-2">
            <Puck.Components />
            <Puck.Outline />
          </div>
          <div className="flex-1 overflow-auto bg-muted/30">
            <Puck.Preview />
          </div>
          <div className="w-80 shrink-0 overflow-y-auto border-l">
            <PanelLateralEditor />
          </div>
        </div>
      </div>
    </Puck>
  )
}
