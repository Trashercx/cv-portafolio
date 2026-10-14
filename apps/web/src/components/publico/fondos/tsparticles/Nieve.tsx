import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Nieve (Fase 7c, UC-15): copos de tamaño y velocidad variables que caen con
 * deriva lateral. Con puntero (`repulse`) se apartan suavemente. Colores del
 * tema (primario y secundario), nunca blanco fijo: sobre un tema claro se ven.
 * `velocidad` escala el rango de caída.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => [
  {
    particulas: {
      number: { value: cantidad(90) },
      paint: { color: { value: [colores.secundario, colores.primario] }, fill: { enable: true } },
      shape: { type: 'circle' },
      opacity: { value: { min: 0.35, max: 0.9 } },
      size: { value: { min: 1, max: 4.2 } },
      move: {
        enable: true,
        direction: 'bottom',
        straight: false,
        random: false,
        speed: { min: 0.5 * ritmo, max: 1.5 * ritmo },
        drift: { min: -0.6, max: 0.6 },
        outModes: { default: 'out' },
      },
    },
    interactividad: { modo: 'repulse', modos: { distance: 110, duration: 0.4, speed: 0.6 } },
  },
]

export function Nieve(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
