import { Puck } from '@measured/puck'
import { puckConfig } from '@/lib/puck-config'
import { usePuckEditor } from './usePuckEditor'

/**
 * Pestaña "Bloque" del panel lateral (Fase 5, panel unificado): sin ninguna
 * lógica propia además de leer `selectedItem` — el formulario real de campos
 * lo arma `<Puck.Fields/>` a partir de la config de cada bloque (ver
 * `puck-config.tsx`), igual que hacía el sidebar derecho nativo de Puck.
 */
export function PanelBloqueSeleccionado() {
  const selectedItem = usePuckEditor((state) => state.selectedItem)

  if (!selectedItem) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Seleccioná un bloque en el lienzo, o arrastrá uno nuevo desde
        &quot;Bloques&quot;.
      </div>
    )
  }

  const label =
    puckConfig.components[selectedItem.type]?.label ?? selectedItem.type

  return (
    <div className="grid gap-3 p-4">
      <h3 className="text-sm font-semibold">{label}</h3>
      <Puck.Fields />
    </div>
  )
}
