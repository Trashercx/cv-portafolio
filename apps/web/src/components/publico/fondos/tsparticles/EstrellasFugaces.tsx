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
      number: { value: cantidad(190) },
      paint: { color: { value: [colores.primario, colores.secundario] }, fill: { enable: true } },
      shape: { type: 'circle' },
      size: { value: { min: 0.8, max: 2.2 } },
      opacity: {
        value: { min: 0.1, max: 1 },
        animation: { enable: true, speed: 0.9 * ritmo, sync: false, startValue: 'random' },
      },
      move: { enable: false },
    },
  },
  {
    particulas: {
      number: { value: Math.max(3, cantidad(7)) },
      paint: {
        color: { value: colores.primario },
        fill: { enable: false },
        stroke: { width: 1.8, opacity: 0.95 },
      },
      shape: { type: 'line', options: { line: { cap: 'round' } } },
      // `size` es el radio de la línea: longitud total de 40 a 120 px.
      size: { value: { min: 20, max: 60 } },
      opacity: {
        // Desvanecimiento: la opacidad sube y baja durante la vida del trazo.
        value: { min: 0.05, max: 1 },
        animation: { enable: true, speed: 1.1, sync: false, startValue: 'random' },
      },
      rotate: { value: 0, path: true, animation: { enable: false } },
      move: {
        enable: true,
        direction: 'bottomRight',
        // Sin abanico angular: todos los trazos siguen la diagonal, y `rotate.path` orienta la línea con ella.
        angle: { value: 0, offset: 0 },
        straight: true,
        random: false,
        speed: { min: 14 * ritmo, max: 24 * ritmo },
        outModes: { default: 'out' },
      },
      life: {
        count: 0,
        duration: { value: { min: 1.2, max: 2 }, sync: true },
        delay: { value: { min: 0.3, max: 1.8 } },
      },
    },
  },
]

export function EstrellasFugaces(props: PropsFondoVisual) {
  return <FondoTsparticles {...props} capas={capas} />
}
