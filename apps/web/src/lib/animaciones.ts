import { useSyncExternalStore } from 'react'
import type { AnimacionEntradaBloque } from '@/features/secciones/types'
import { useModoRenderizado } from '@/components/publico/contexto-renderizado'

/**
 * Animaciones de entrada por bloque (Fase 7, 7.3, UC-12). Único lugar donde un
 * token de `animacion_entrada` (lo que persiste `Seccion.configuracion`) se
 * traduce a las propiedades de `motion`: tabla literal, igual criterio que
 * `escalas-bloque.ts` para las clases Tailwind.
 */
type EstadoEntrada = { opacity: number; x?: number; y?: number; scale?: number }

type VarianteEntrada = {
  initial: EstadoEntrada
  whileInView: EstadoEntrada
  transition: { duration: number; ease: 'easeOut' }
}

export const VARIANTES_ENTRADA: Record<
  Exclude<AnimacionEntradaBloque, 'ninguna'>,
  VarianteEntrada
> = {
  aparecer: {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  deslizar_arriba: {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  deslizar_lateral: {
    initial: { opacity: 0, x: -40 },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  escalar: {
    initial: { opacity: 0, scale: 0.94 },
    whileInView: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

/** Opciones de `viewport` de `whileInView`: se revela una sola vez al ver el 20 % del elemento. */
export const VIEWPORT_ENTRADA = { once: true, amount: 0.2 } as const

/** Retraso (s) de cada ítem de una lista para el efecto escalonado; tope para listas largas. */
export function escalonado(indice: number, paso = 0.08): number {
  return Math.min(indice, 8) * paso
}

const CONSULTA_MOVIMIENTO_REDUCIDO = '(prefers-reduced-motion: reduce)'

function suscribirMovimientoReducido(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_MOVIMIENTO_REDUCIDO)
  consulta.addEventListener('change', avisar)
  return () => consulta.removeEventListener('change', avisar)
}

/**
 * `true` si el visitante pidió reducir el movimiento (`prefers-reduced-motion`).
 * Implementado con `matchMedia` y `useSyncExternalStore` (valor correcto desde
 * el primer render, sin parpadeo) en vez de `useReducedMotion` de `motion`,
 * que cachea la consulta a nivel de módulo y no se puede variar en tests.
 */
export function usePrefiereMovimientoReducido(): boolean {
  return useSyncExternalStore(
    suscribirMovimientoReducido,
    () => window.matchMedia(CONSULTA_MOVIMIENTO_REDUCIDO).matches,
    () => false,
  )
}

/**
 * ¿Se permiten animaciones de entrada/contadores/rotación? No con
 * `prefers-reduced-motion` y tampoco dentro del lienzo de Puck
 * (`modoRenderizado === 'editor'`): ahí un bloque que aparece o se mueve
 * estorba al arrastrar y al seleccionar. Los efectos hover SÍ siguen activos
 * en el lienzo (los gobierna `TarjetaInteractiva`, que solo mira el
 * movimiento reducido).
 */
export function useAnimacionesActivas(): boolean {
  const reducido = usePrefiereMovimientoReducido()
  const modo = useModoRenderizado()
  return !reducido && modo !== 'editor'
}
