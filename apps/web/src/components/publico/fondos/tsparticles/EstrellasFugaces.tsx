import type { PropsFondoVisual } from '../utilidades'
import { FondoTsparticles } from './FondoTsparticles'
import type { ConstructorCapas } from './tipos'

/**
 * Estrellas fugaces (Fase 7c, UC-15): dos capas. Abajo, un cielo de puntos
 * quietos que titilan (opacidad animada). Arriba, pocos trazos rápidos en
 * diagonal: forma `line` (el `trail` de tsparticles es un efecto que no
 * viene en el paquete slim; una línea orientada por `rotate.path` con trazo
 * grueso da el mismo resultado sin dependencias) con `life` finita y retardo
 * aleatorio, de modo que aparecen de forma ocasional y no todas a la vez.
 * Sin puntero. Colores del tema.
 */
const capas: ConstructorCapas = ({ colores, cantidad, ritmo }) => [
  {
    particulas: {
      number: { value: cantidad(80) },
      paint: { color: { value: [colores.primario, colores.secundario] }, fill: { enable: true } },
      shape: { type: 'circle' },
      size: { value: { min: 0.5, max: 1.7 } },
      opacity: {
        value: { min: 0.2, max: 0.95 },
        animation: { enable: true, speed: 0.5 * ritmo, sync: false, startValue: 'random' },
      },
      move: { enable: false },
    },
  },
  {
    particulas: {
      number: { value: Math.max(2, cantidad(3)) },
      paint: {
        color: { value: colores.primario },
        fill: { enable: false },
        stroke: { width: 1.8, opacity: 0.95 },
      },
      shape: { type: 'line', options: { line: { cap: 'round' } } },
      size: { value: { min: 28, max: 64 } },
      opacity: { value: { min: 0.7, max: 1 } },
      rotate: { value: 0, path: true, animation: { enable: false } },
      move: {
        enable: true,
        direction: 'bottomRight',
        straight: true,
        random: false,
        speed: { min: 14 * ritmo, max: 24 * ritmo },
        outModes: { default: 'out' },
      },
      life: {
        count: 0,
        duration: { value: { min: 0.9, max: 1.6 } },
        delay: { value: { min: 1.5, max: 6 } },
      },
    },
  },
]

export function EstrellasFugaces(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
