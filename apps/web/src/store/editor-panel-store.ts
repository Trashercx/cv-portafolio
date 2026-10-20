import { create } from 'zustand'
import type { TipoFondo } from '@/features/fondo-sitio/catalogo-fondos'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import type { ModoTema } from '@/lib/tema-oscuro'

/** Nombres de los plugins propios del rail de Puck (Fase 7, UC-07/UC-08). */
export type PluginEditor = 'tema' | 'fondo'

/** Clave de `localStorage` del modo de la vista previa (Fase 7, UC-08). */
export const CLAVE_MODO_VISTA_PREVIA = 'editor-modo-vista-previa'

/** `null` = seguir el modo (claro/oscuro) del propio panel de administración. */
export type ModoVistaPrevia = ModoTema | null

function leerModoVistaPreviaGuardado(): ModoVistaPrevia {
  if (typeof window === 'undefined') return null
  try {
    const guardado = window.localStorage.getItem(CLAVE_MODO_VISTA_PREVIA)
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : null
  } catch {
    // `localStorage` puede lanzar (modo privado, cuota): se sigue al panel.
    return null
  }
}

function guardarModoVistaPrevia(modo: ModoVistaPrevia) {
  try {
    if (modo === null) window.localStorage.removeItem(CLAVE_MODO_VISTA_PREVIA)
    else window.localStorage.setItem(CLAVE_MODO_VISTA_PREVIA, modo)
  } catch {
    // Sin persistencia: el override sigue valiendo durante la sesión.
  }
}

/** Subconjunto serializable de `ui.viewports.current` de Puck. */
export type ViewportActual = { width: number; height: number | 'auto' }

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
  /**
   * Fondo que el admin está ajustando en el panel Fondo (Fase 7b, UC-15): el
   * lienzo (`PuckRoot`) lo prioriza sobre el fondo activo del servidor para
   * mostrar el cambio antes de guardarlo. Estado de edición en curso, nunca
   * del servidor; se limpia al guardar, cancelar o cambiar de plugin.
   */
  fondoEnEdicion: FondoSitio | null
  setFondoEnEdicion: (fondo: FondoSitio | null) => void
  /**
   * Tipo de fondo elegido en la galería del plugin Fondo (Fase 7l, UC-15): sus
   * ajustes (`PanelAjustesFondo`) se muestran en el panel derecho mientras no
   * haya un bloque seleccionado. No persistido; se limpia al cambiar de plugin
   * (junto con `fondoEnEdicion`), al desmontar el panel y al seleccionar un
   * bloque en el lienzo.
   */
  fondoSeleccionado: TipoFondo | null
  setFondoSeleccionado: (tipo: TipoFondo | null) => void
  /**
   * Viewport actual del lienzo (`ui.viewports.current`), recordado para el
   * remount de `<Puck>` tras guardar (Fase 7, UC-07). Solo en memoria, no en
   * `localStorage`: es preferencia de la sesión de edición en curso. La
   * selección (`ui.itemSelector`) NO se conserva: es un índice y, tras
   * guardar, las secciones nuevas cambian de id y el orden puede variar, así
   * que restaurarla podría apuntar a otro bloque.
   */
  viewportActual: ViewportActual | null
  setViewportActual: (viewport: ViewportActual | null) => void
  /**
   * Modo de la vista previa (Fase 7, UC-08): `'claro'`/`'oscuro'` fuerza el
   * modo SOLO del lienzo (`PuckRoot`) y de `DialogVistaPrevia`; `null` sigue
   * el modo del panel (`ThemeProvider`). Persistido en `localStorage`
   * (`editor-modo-vista-previa`). El chrome del admin nunca cambia.
   */
  modoVistaPrevia: ModoVistaPrevia
  setModoVistaPrevia: (modo: ModoVistaPrevia) => void
  /**
   * "Vista limpia" (Fase 7c, UC-07): `true` = el lienzo se ve como el sitio
   * publicado (Puck en `ui.previewMode = 'interactive'`, sin overlays ni
   * recuadros, y las secciones ocultas no se pintan). NO persistido:
   * `LienzoPuck` lo vuelve a `false` al desmontarse (cambio de ruta). La
   * traducción a `previewMode` la hace `SincronizadorVistaLimpia`, que vive
   * dentro del contexto de Puck.
   */
  vistaLimpia: boolean
  setVistaLimpia: (activa: boolean) => void
  alternarVistaLimpia: () => void
}

export const useEditorPanelStore = create<EditorPanelState>((set) => ({
  pluginActivo: null,
  // Cambiar de plugin descarta el ajuste de fondo sin guardar (Fase 7b, UC-15).
  setPluginActivo: (pluginActivo) =>
    set((estado) =>
      estado.pluginActivo === pluginActivo
        ? { pluginActivo }
        : { pluginActivo, fondoEnEdicion: null, fondoSeleccionado: null },
    ),
  fondoEnEdicion: null,
  setFondoEnEdicion: (fondoEnEdicion) => set({ fondoEnEdicion }),
  fondoSeleccionado: null,
  setFondoSeleccionado: (fondoSeleccionado) => set({ fondoSeleccionado }),
  viewportActual: null,
  setViewportActual: (viewportActual) => set({ viewportActual }),
  modoVistaPrevia: leerModoVistaPreviaGuardado(),
  setModoVistaPrevia: (modoVistaPrevia) => {
    guardarModoVistaPrevia(modoVistaPrevia)
    set({ modoVistaPrevia })
  },
  vistaLimpia: false,
  setVistaLimpia: (vistaLimpia) => set({ vistaLimpia }),
  alternarVistaLimpia: () => set((estado) => ({ vistaLimpia: !estado.vistaLimpia })),
}))
