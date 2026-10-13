import { createUsePuck } from '@measured/puck'
import { puckConfig } from '@/lib/puck-config'

/**
 * Hook `usePuck` tipado contra `puckConfig` (Fase 5, panel unificado): el
 * `usePuck()` genérico que exporta `@measured/puck` no acepta selector (ver
 * `node_modules/@measured/puck/dist/index.js`) — siempre re-suscribe el
 * componente a TODO el estado del store y además emite un
 * `console.warn` recomendando reemplazarlo por `createUsePuck()` con un
 * selector, que sí evita re-renders innecesarios. Se crea una sola vez acá
 * (en vez de llamar `createUsePuck` dentro de cada componente) para que
 * `ViewportSwitcher`, `PanelBloqueSeleccionado`, `PanelLateralEditor` y
 * `LienzoPuck` compartan la misma función tipada contra
 * `PuckSeccionesComponents`.
 */
export const usePuckEditor = createUsePuck<typeof puckConfig>()
