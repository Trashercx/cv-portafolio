import { createUsePuck } from '@puckeditor/core'
import { puckConfig } from '@/lib/puck-config'

/**
 * Hook `usePuck` tipado contra `puckConfig` (Fase 5, panel unificado): el
 * `usePuck()` genérico que exporta `@puckeditor/core` no acepta selector (ver
 * `node_modules/@puckeditor/core/dist/index.js`) — siempre re-suscribe el
 * componente a TODO el estado del store y además emite un
 * `console.warn` recomendando reemplazarlo por `createUsePuck()` con un
 * selector, que sí evita re-renders innecesarios. Se crea una sola vez acá
 * (en vez de llamar `createUsePuck` dentro de cada componente) para que
 * `LienzoPuck` (Fase 7: sin los paneles propios de antes) y
 * los componentes que lo necesiten compartan la misma función tipada contra
 * `PuckSeccionesComponents`.
 */
export const usePuckEditor = createUsePuck<typeof puckConfig>()
