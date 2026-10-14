import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Burbujas (Fase 7c, UC-15): círculos translúcidos con borde fino que
 * ascienden con deriva lateral; las pequeñas suben más rápido. Con puntero
 * (`bubble`) las cercanas crecen. Relleno muy tenue y trazo definido en
 * colores del tema, para que se lean también sobre fondo claro.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => [
  {
    particulas: {
      number: { value: cantidad(26) },
      paint: {
        color: { value: [colores.primario, colores.secundario] },
        fill: { enable: true, opacity: { min: 0.05, max: colores.claro ? 0.22 : 0.14 } },
        stroke: { width: 1.2, opacity: colores.claro ? 0.8 : 0.55 },
      },
      shape: { type: 'circle' },
      opacity: { value: 1 },
      size: { value: { min: 6, max: 26 } },
      move: {
        enable: true,
        direction: 'top',
        straight: false,
        random: false,
        speed: { min: 0.35 * ritmo, max: 1 * ritmo },
        drift: { min: -0.35, max: 0.35 },
        outModes: { default: 'out' },
      },
    },
    interactividad: {
      modo: 'bubble',
      modos: { distance: 150, size: 40, duration: 0.5, opacity: 1 },
    },
  },
]

export function Burbujas(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
