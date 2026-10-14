import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Luciérnagas (Fase 7c, UC-15): dos capas: halo translúcido (glow) y núcleo de puntos cálidos (primario/secundario) que
 * vagan despacio con trayectoria aleatoria y pulsan su opacidad; cada uno
 * tiene vida finita (`life`): se apaga y reaparece en otro sitio tras un
 * retardo, como una luciérnaga real. Sin interacción con el puntero.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => {
  const movimiento = {
    enable: true,
    direction: 'none',
    random: true,
    straight: false,
    speed: { min: 0.15 * ritmo, max: 0.55 * ritmo },
    outModes: { default: 'out' },
  }
  return [
    // Halo: población pequeña de círculos grandes y muy translúcidos (glow).
    {
      particulas: {
        number: { value: cantidad(16) },
        paint: { color: { value: colores.primario }, fill: { enable: true } },
        shape: { type: 'circle' },
        size: { value: { min: 10, max: 18 } },
        opacity: {
          value: { min: 0.08, max: 0.15 },
          animation: { enable: true, speed: 0.4 * ritmo, sync: false, startValue: 'random' },
        },
        move: { ...movimiento, speed: { min: 0.1 * ritmo, max: 0.35 * ritmo } },
      },
    },
    // Núcleo: puntos cálidos que pulsan entre 0,2 y 0,9 y vuelan en círculos pequeños.
    {
      particulas: {
        number: { value: cantidad(32) },
        paint: { color: { value: [colores.primario, colores.secundario] }, fill: { enable: true } },
        shape: { type: 'circle' },
        size: {
          value: { min: 3, max: 6.5 },
          animation: { enable: true, speed: 3, sync: false, startValue: 'random', minimumValue: 2.5 },
        },
        opacity: {
          value: { min: 0.2, max: 0.9 },
          animation: { enable: true, speed: 0.8 * ritmo, sync: false, startValue: 'random' },
        },
        move: movimiento,
        life: {
          count: 0,
          duration: { value: { min: 6, max: 12 } },
          delay: { value: { min: 0, max: 3 } },
        },
      },
    },
  ]
}

export function Luciernagas(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
