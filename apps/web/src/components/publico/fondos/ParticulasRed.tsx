import { useRef } from 'react'
import { CapaFondo } from './CapaFondo'
import { useBucleCanvas } from './hooks/useBucleCanvas'
import { usePunteroRelativo } from './hooks/usePunteroRelativo'
import { acotar, factorIntensidad, oscurecerColor, ritmo, type PropsFondoVisual } from './utilidades'

type Particula = {
  x: number
  y: number
  /** Velocidad base (px/s). */
  vx: number
  vy: number
  /** Impulso por repulsión del puntero (px/s), decae solo. */
  ix: number
  iy: number
  radio: number
}

const DISTANCIA_ENLACE = 140
const RADIO_REPULSION = 150
const RADIO_CURSOR = 170

/**
 * Red de partículas (Fase 7b, UC-15). Canvas 2D con 40–70 nodos (según el
 * área y la intensidad) que derivan despacio y se enlazan con líneas cuya
 * opacidad cae con la distancia. Con puntero, los nodos cercanos reciben un
 * impulso que los aparta (repulsión con decaimiento exponencial) y el cursor
 * dibuja hilos finos hacia los más próximos. Colores: nodos
 * `--color-primario`, enlaces `--color-secundario` (leídos con
 * `getComputedStyle` por `useBucleCanvas`). Estático (miniatura/movimiento
 * reducido): un solo fotograma de la distribución inicial.
 */
export function ParticulasRed({
  velocidad,
  intensidad,
  interactivo,
  estatico,
  maxFps,
  ambito,
}: PropsFondoVisual) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const particulas = useRef<Particula[]>([])
  const puntero = useRef<{ x: number; y: number } | null>(null)
  const f = factorIntensidad(intensidad)
  const velocidadBase = 16 * ritmo(velocidad)

  usePunteroRelativo(canvas, interactivo, (p) => {
    puntero.current = p ? { x: p.px, y: p.py } : null
  })

  useBucleCanvas(canvas, {
    estatico,
    maxFps,
    clave: `${intensidad}-${velocidad}`,
    preparar: (ancho, alto) => {
      const cantidad = acotar(Math.round((ancho * alto) / 26000 * f), 40, 70)
      particulas.current = Array.from({ length: cantidad }, () => {
        const angulo = Math.random() * Math.PI * 2
        const rapidez = velocidadBase * (0.4 + Math.random() * 0.9)
        return {
          x: Math.random() * ancho,
          y: Math.random() * alto,
          vx: Math.cos(angulo) * rapidez,
          vy: Math.sin(angulo) * rapidez,
          ix: 0,
          iy: 0,
          radio: (1.2 + Math.random() * 1.4) * (0.8 + 0.2 * f),
        }
      })
    },
    dibujar: (ctx, { ancho, alto, dt, colores }) => {
      const lista = particulas.current
      const cursor = puntero.current
      const amortiguacion = Math.exp(-3 * dt)

      ctx.clearRect(0, 0, ancho, alto)

      // Fondo claro (QA Fase 7b): trazos más oscuros y con más alfa, o no se ven.
      const claro = colores.claro
      const colorEnlace = claro ? oscurecerColor(colores.secundario, 0.25) : colores.secundario
      const colorNodo = claro ? oscurecerColor(colores.primario, 0.2) : colores.primario
      const alfaEnlace = claro ? 0.9 : 0.55
      const alfaNodo = claro ? 1 : 0.9
      const alfaHalo = claro ? 0.26 : 0.14

      for (const p of lista) {
        if (cursor) {
          const dx = p.x - cursor.x
          const dy = p.y - cursor.y
          const d = Math.hypot(dx, dy)
          if (d < RADIO_REPULSION && d > 0.01) {
            const fuerza = (1 - d / RADIO_REPULSION) ** 2 * 900 * dt
            p.ix += (dx / d) * fuerza
            p.iy += (dy / d) * fuerza
          }
        }
        p.ix *= amortiguacion
        p.iy *= amortiguacion
        p.x += (p.vx + p.ix) * dt
        p.y += (p.vy + p.iy) * dt
        if (p.x < -10) p.x = ancho + 10
        else if (p.x > ancho + 10) p.x = -10
        if (p.y < -10) p.y = alto + 10
        else if (p.y > alto + 10) p.y = -10
      }

      // Enlaces entre vecinas.
      ctx.strokeStyle = colorEnlace
      ctx.lineWidth = claro ? 1.3 : 1
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const d = Math.hypot(lista[i].x - lista[j].x, lista[i].y - lista[j].y)
          if (d < DISTANCIA_ENLACE) {
            ctx.globalAlpha = (1 - d / DISTANCIA_ENLACE) * alfaEnlace * Math.min(1, f)
            ctx.beginPath()
            ctx.moveTo(lista[i].x, lista[i].y)
            ctx.lineTo(lista[j].x, lista[j].y)
            ctx.stroke()
          }
        }
      }

      // Hilos del cursor hacia los nodos próximos.
      if (cursor) {
        ctx.strokeStyle = colorNodo
        for (const p of lista) {
          const d = Math.hypot(p.x - cursor.x, p.y - cursor.y)
          if (d < RADIO_CURSOR) {
            ctx.globalAlpha = (1 - d / RADIO_CURSOR) * 0.7
            ctx.beginPath()
            ctx.moveTo(cursor.x, cursor.y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        }
      }

      // Nodos con un halo tenue para dar profundidad.
      ctx.fillStyle = colorNodo
      for (const p of lista) {
        ctx.globalAlpha = alfaHalo
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radio * 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = alfaNodo
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    },
  })

  return (
    <CapaFondo ambito={ambito}>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </CapaFondo>
  )
}

