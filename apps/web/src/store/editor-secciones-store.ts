import { create } from 'zustand'
import type { Content } from '@puckeditor/core'
import type { PuckSeccionesComponents } from '@/lib/puck-config'

type EditorContent = Content<PuckSeccionesComponents>

type EditorSeccionesState = {
  /**
   * Espejo del `content` actual de Puck (UC-07): se actualiza en cada
   * `onChange` del editor. Vive en Zustand — nunca en TanStack Query —
   * porque es estado de edición en curso, no estado del servidor (regla de
   * `CLAUDE.md`). El botón "Guardar cambios" de `EditorSeccionesPage` lee
   * de aquí para decidir qué crear/actualizar/eliminar/reordenar.
   */
  content: EditorContent
  setContent: (content: EditorContent) => void
  /**
   * Hay ediciones en el lienzo que todavía no se guardaron (Fase 7, UC-08):
   * lo enciende cualquier acción que modifica datos en Puck
   * (`LienzoPuck` → `onCambio`) y lo apaga un guardado exitoso o salir del
   * editor. Alimenta el punto del botón "Guardar cambios", `beforeunload` y
   * la confirmación al navegar fuera (`GuardiaNavegacionEditor`).
   */
  hayCambiosSinGuardar: boolean
  setHayCambiosSinGuardar: (hay: boolean) => void
  /**
   * Destino de una navegación interna interceptada mientras hay cambios sin
   * guardar (sidebar o paleta de comandos); `null` si no hay ninguna
   * pendiente de confirmar. El router es `BrowserRouter` (no data router),
   * donde `useBlocker` no está disponible.
   */
  destinoPendiente: string | null
  setDestinoPendiente: (destino: string | null) => void
  /**
   * Acción "Guardar cambios" registrada por `EditorSeccionesPage` mientras
   * está montada: permite que el atajo `Ctrl/Cmd+S` capturado DENTRO del
   * iframe del lienzo (`PuckRoot`) dispare el mismo guardado que el botón.
   */
  accionGuardar: (() => void) | null
  setAccionGuardar: (accion: (() => void) | null) => void
}

export const useEditorSeccionesStore = create<EditorSeccionesState>((set) => ({
  content: [],
  setContent: (content) => set({ content }),
  hayCambiosSinGuardar: false,
  setHayCambiosSinGuardar: (hayCambiosSinGuardar) => set({ hayCambiosSinGuardar }),
  destinoPendiente: null,
  setDestinoPendiente: (destinoPendiente) => set({ destinoPendiente }),
  accionGuardar: null,
  setAccionGuardar: (accionGuardar) => set({ accionGuardar }),
}))
