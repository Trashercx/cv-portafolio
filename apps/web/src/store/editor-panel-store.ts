import { create } from 'zustand'

export type PestanaPanel = 'bloque' | 'tema' | 'fondo'

type EditorPanelState = {
  /**
   * Pestaña activa del panel lateral derecho del editor unificado
   * (`/admin/editor` — fusión de Editor visual + Tema + Fondo del sitio):
   * estado de edición en curso (qué pestaña está mirando el admin ahora
   * mismo), nunca estado del servidor — vive en Zustand por la misma regla
   * de `CLAUDE.md` que ya sigue `useEditorSeccionesStore`.
   */
  pestanaActiva: PestanaPanel
  setPestanaActiva: (pestana: PestanaPanel) => void
}

export const useEditorPanelStore = create<EditorPanelState>((set) => ({
  pestanaActiva: 'bloque',
  setPestanaActiva: (pestanaActiva) => set({ pestanaActiva }),
}))
