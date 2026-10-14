import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Constelación (Fase 7c, UC-15): puntos que derivan despacio y se enlazan
 * con líneas finas (`links`); al acercar el puntero (`grab`) los enlaces se
 * dibujan hacia el cursor. Nodos en `--color-primario`, enlaces en
 * `--color-secundario`; sobre fondo claro suben la opacidad de los enlaces.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => [
  {
    particulas: {
      number: { value: cantidad(64) },
      paint: { color: { value: colores.primario }, fill: { enable: true } },
      shape: { type: 'circle' },
      opacity: { value: { min: 0.5, max: 0.95 } },
      size: { value: { min: 1, max: 2.8 } },
      move: {
        enable: true,
        direction: 'none',
        random: true,
        straight: false,
        speed: 0.45 * ritmo,
        outModes: { default: 'out' },
      },
      links: {
        enable: true,
        distance: 135,
        color: { value: colores.secundario },
        opacity: colores.claro ? 0.7 : 0.45,
        width: 1,
      },
    },
    interactividad: {
      modo: 'grab',
      modos: { distance: 170, links: { opacity: 0.9 } },
    },
  },
]

export function Constelacion(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
