import type { UiState, Viewports } from '@puckeditor/core'

/**
 * Viewports del selector NATIVO de Puck (Fase 7, UC-07): 360 móvil, 768
 * tablet, 1280 escritorio y el ancho completo del canvas. Antes (Fase 5) un
 * `ViewportSwitcher` propio los reemplazaba porque el layout manual no podía
 * montar el `ViewportControls` de Puck; con el layout nativo ya no hace
 * falta. Los iconos (`'Smartphone'`, `'Tablet'`, `'Monitor'`, `'FullWidth'`)
 * son los que Puck resuelve internamente.
 */
export const PUCK_VIEWPORTS: Viewports = [
  { width: 360, height: 'auto', icon: 'Smartphone', label: 'Móvil' },
  { width: 768, height: 'auto', icon: 'Tablet', label: 'Tablet' },
  { width: 1280, height: 'auto', icon: 'Monitor', label: 'Escritorio' },
  { width: '100%', height: 'auto', icon: 'FullWidth', label: 'Ancho completo' },
]

/**
 * Estado inicial de `ui`: Puck 0.21+ arranca en ancho completo, pero el
 * lienzo debe mostrarse fiel al sitio de escritorio (1280, con auto-zoom
 * para que quepa), así que se fija el viewport actual explícitamente.
 * `Partial<UiState>` solo hace opcionales las claves de primer nivel: hay
 * que repetir la forma completa de `viewports` (`current`,
 * `controlsVisible`, `options`).
 */
export const PUCK_UI_INICIAL: Partial<UiState> = {
  viewports: {
    current: { width: 1280, height: 'auto' },
    controlsVisible: true,
    options: [],
  },
}
