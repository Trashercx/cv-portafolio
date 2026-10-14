import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Confeti suave (Fase 7c, UC-15): cuadrados y círculos pequeños que caen
 * despacio con deriva y giran sobre sí mismos (`rotate.animation`, sentido
 * aleatorio). Colores del tema (primario y secundario) con opacidad media
 * para que no compitan con el contenido. Sin puntero.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => [
  {
    particulas: {
      number: { value: cantidad(63) },
      paint: { color: { value: [colores.primario, colores.secundario] }, fill: { enable: true } },
      shape: { type: ['square', 'circle'] },
      opacity: { value: { min: 0.45, max: 0.9 } },
      size: { value: { min: 3, max: 7 } },
      rotate: {
        value: { min: 0, max: 360 },
        direction: 'random',
        animation: { enable: true, speed: { min: 4 * ritmo, max: 14 * ritmo }, sync: false },
      },
      move: {
        enable: true,
        direction: 'bottom',
        straight: false,
        random: false,
        speed: { min: 0.3 * ritmo, max: 0.9 * ritmo },
        drift: { min: -0.5, max: 0.5 },
        outModes: { default: 'out' },
      },
    },
  },
]

export function ConfetiSuave(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
