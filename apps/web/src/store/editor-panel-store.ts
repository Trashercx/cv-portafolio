import { create } from 'zustand'

/** Nombres de los plugins propios del rail de Puck (Fase 7, UC-07/UC-08). */
export type PluginEditor = 'tema' | 'fondo'

type EditorPanelState = {
  /**
   * Plugin activo del rail de Puck (`ui.plugin.current`: `blocks`,
   * `outline`, `fields`, `tema` o `fondo`) o `null` si el admin no eligió
   * ninguno. Puck gestiona por su cuenta el plugin activo mientras el
   * editor está montado; este estado solo existe para (1) abrir el plugin
   * pedido por `?panel=tema|fondo` al montar y (2) recordar el plugin
   * activo cuando `<Puck>` se remonta tras guardar (`editorKey`). Estado de
   * edición en curso, nunca del servidor (regla de `CLAUDE.md`).
   */
  pluginActivo: string | null
  setPluginActivo: (plugin: string | null) => void
}

export const useEditorPanelStore = create<EditorPanelState>((set) => ({
  pluginActivo: null,
  setPluginActivo: (pluginActivo) => set({ pluginActivo }),
}))
