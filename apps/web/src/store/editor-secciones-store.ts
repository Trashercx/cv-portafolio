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
}

export const useEditorSeccionesStore = create<EditorSeccionesState>((set) => ({
  content: [],
  setContent: (content) => set({ content }),
}))
