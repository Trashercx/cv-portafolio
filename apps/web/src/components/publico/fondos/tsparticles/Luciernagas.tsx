import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Luciérnagas (Fase 7c, UC-15): puntos cálidos (primario/secundario) que
 * vagan despacio con trayectoria aleatoria y pulsan su opacidad; cada uno
 * tiene vida finita (`life`): se apaga y reaparece en otro sitio tras un
 * retardo, como una luciérnaga real. Sin interacción con el puntero.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => [
  {
    particulas: {
      number: { value: cantidad(30) },
      paint: { color: { value: [colores.primario, colores.secundario] }, fill: { enable: true } },
      shape: { type: 'circle' },
      size: {
        value: { min: 1.6, max: 3.8 },
        animation: { enable: true, speed: 1.2, sync: false, startValue: 'random' },
      },
      opacity: {
        value: { min: 0.15, max: 1 },
        animation: { enable: true, speed: 0.8 * ritmo, sync: false, startValue: 'random' },
      },
      move: {
        enable: true,
        direction: 'none',
        random: true,
        straight: false,
        speed: { min: 0.15 * ritmo, max: 0.55 * ritmo },
        outModes: { default: 'out' },
      },
      life: {
        count: 0,
        duration: { value: { min: 6, max: 12 } },
        delay: { value: { min: 0, max: 3 } },
      },
    },
  },
]

export function Luciernagas(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
