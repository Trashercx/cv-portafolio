import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PUCK_VIEWPORTS } from './puck-viewports'
import { usePuckEditor } from './usePuckEditor'

const ICONO_POR_LABEL: Record<string, LucideIcon> = {
  Escritorio: Monitor,
  Tablet,
  Móvil: Smartphone,
}

/**
 * `Viewport` (tipo de Puck) marca `label`/`height` como opcionales —
 * pensado para poder pasar un `icon` `ReactNode` custom sin label, algo que
 * este componente no usa — así que se resuelven acá con un fallback
 * (`PUCK_VIEWPORTS` en la práctica siempre los define, ver
 * `puck-viewports.ts`) para poder tipar el resto del componente sin
 * `undefined`.
 */
const OPCIONES_VIEWPORT = PUCK_VIEWPORTS.map((viewport) => ({
  width: viewport.width,
  height: viewport.height ?? 'auto',
  label: viewport.label ?? 'Viewport',
}))

/**
 * Selector de viewport propio (Fase 5, panel unificado): reemplaza el
 * `ViewportControls` nativo de Puck, que no se exporta desde el paquete (ver
 * `node_modules/@puckeditor/core/dist/index.d.ts`) y por lo tanto no se puede
 * reconstruir con el layout compuesto a mano de `LienzoPuck`. A diferencia
 * del original, esta versión no incluye el slider de zoom — solo los 3
 * botones de tamaño (`PUCK_VIEWPORTS`).
 *
 * Cambia `state.ui.viewports.current` con `dispatch({ type: 'setUi', ... })`
 * — el mismo mecanismo interno que usa Puck (ver comentario de
 * `PUCK_UI_INICIAL` en `puck-viewports.ts`), preservando `controlsVisible`/
 * `options` del estado actual porque `setUi` reemplaza `ui.viewports` entero
 * en vez de mezclarlo campo a campo.
 */
export function ViewportSwitcher() {
  const dispatch = usePuckEditor((state) => state.dispatch)
  const viewports = usePuckEditor((state) => state.appState.ui.viewports)

  return (
    <div
      role="group"
      aria-label="Tamaño de vista previa"
      className="flex items-center gap-1"
    >
      {OPCIONES_VIEWPORT.map(({ width, height, label }) => {
        const Icono = ICONO_POR_LABEL[label] ?? Monitor
        const activo = viewports.current.width === width
        return (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-pressed={activo}
            className={cn(activo && 'bg-accent text-accent-foreground')}
            onClick={() =>
              dispatch({
                type: 'setUi',
                ui: { viewports: { ...viewports, current: { width, height } } },
              })
            }
          >
            <Icono className="size-4" />
          </Button>
        )
      })}
    </div>
  )
}
