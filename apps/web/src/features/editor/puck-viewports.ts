import type { UiState, Viewports } from '@measured/puck'

/**
 * Opciones del selector de viewport propio (`ViewportSwitcher`), con el
 * escritorio primero (el panel de administración se usa mayormente en
 * desktop). También se pasan como prop `viewports` de `<Puck>` en
 * `LienzoPuck` — Puck las usa para su propio `ViewportControls` nativo, que
 * ya no se monta (el layout se reconstruye a mano vía `children`), pero
 * sigue siendo la fuente de las opciones válidas para `state.ui.viewports`.
 */
export const PUCK_VIEWPORTS: Viewports = [
  { width: 1280, height: 'auto', icon: 'Monitor', label: 'Escritorio' },
  { width: 768, height: 'auto', icon: 'Tablet', label: 'Tablet' },
  { width: 360, height: 'auto', icon: 'Smartphone', label: 'Móvil' },
]

/**
 * Puck siempre inicializa `state.ui.viewports.current` desde su propio
 * `defaultViewports[0]` (360px / "Small"), sin importar la prop `viewports`
 * de arriba (que solo cambia las OPCIONES del selector, no el estado
 * inicial) — por eso hace falta fijarlo explícitamente vía la prop `ui`.
 * `Partial<UiState>` solo hace opcionales las claves de nivel superior: si
 * se pasa `viewports`, Puck lo mezcla con un spread superficial contra su
 * estado por defecto (confirmado en `reducer/actions/set-ui.ts` — mismo
 * mecanismo que usa `ViewportSwitcher` para cambiar `current` más tarde), así
 * que hay que repetir la forma completa (`current`, `controlsVisible`,
 * `options`) y no solo `current`, o `controlsVisible`/`options` quedarían
 * `undefined`.
 */
export const PUCK_UI_INICIAL: Partial<UiState> = {
  viewports: {
    current: { width: 1280, height: 'auto' },
    controlsVisible: true,
    options: [],
  },
}
