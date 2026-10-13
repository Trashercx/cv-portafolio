import type { EfectoHoverTarjeta } from '@/features/secciones/types'

/**
 * Efectos hover de las tarjetas (Fase 7, 7.3, UC-12): tablas literales de
 * clases Tailwind (regla de la Fase 3.x, nunca concatenadas en runtime),
 * compartidas por el lienzo y el sitio público. El comportamiento `inclinar`
 * (tilt 3D que sigue al cursor) vive en `TarjetaInteractiva`, porque necesita
 * `motion`; aquí solo queda su clase de apoyo.
 *
 * `elevar` es CSS puro y respeta `prefers-reduced-motion` quitando el
 * desplazamiento (queda la sombra).
 */
export const EFECTO_HOVER_CLASE: Record<EfectoHoverTarjeta, string> = {
  ninguno: '',
  elevar:
    'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0',
  inclinar: 'transition-shadow duration-300 hover:shadow-xl will-change-transform',
}

/** Inclinación máxima (grados) del efecto `inclinar`. */
export const INCLINACION_MAXIMA_GRADOS = 6

/**
 * `efecto_hover` de la galería (`zoom` | `elevar` | `ninguno`): clase de la
 * tarjeta contenedora y de la imagen. `zoom` conserva el `scale-105` de
 * siempre, que es el default.
 */
export const EFECTO_HOVER_GALERIA_CLASE: Record<
  'ninguno' | 'zoom' | 'elevar',
  { tarjeta: string; imagen: string }
> = {
  ninguno: { tarjeta: '', imagen: '' },
  zoom: { tarjeta: '', imagen: 'transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100' },
  elevar: {
    tarjeta:
      'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0',
    imagen: '',
  },
}
