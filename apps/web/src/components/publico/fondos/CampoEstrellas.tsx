import { useRef } from 'react'
import { CapaFondo } from './CapaFondo'
import { useBucleCanvas } from './hooks/useBucleCanvas'
import { usePunteroRelativo } from './hooks/usePunteroRelativo'
import { useScrollRelativo } from './hooks/useScrollRelativo'
import { acotar, factorIntensidad, ritmo, type PropsFondoVisual } from './utilidades'

type Estrella = { x: number; y: number; radio: number; fase: number; brillo: number }
type CapaEstrellas = { estrellas: Estrella[]; profundidad: number }

/** Parámetros por capa: lejana, media y cercana (la cercana lleva halo). */
const CAPAS = [
  { cantidad: 90, radio: [0.5, 0.9], profundidad: 0.15, color: 'secundario' },
  { cantidad: 46, radio: [0.8, 1.3], profundidad: 0.4, color: 'primario' },
  { cantidad: 16, radio: [1.2, 2], profundidad: 0.85, color: 'primario' },
] as const

/**
 * Campo de estrellas (Fase 7b, UC-15). Canvas 2D con tres capas de puntos
 * (la cantidad escala con el área y la intensidad). Cada capa se desplaza con
 * una profundidad distinta según el puntero y el scroll (parallax suavizado
 * con interpolación exponencial), deriva muy despacio y parpadea con un
 * seno de fase propia; las estrellas cercanas llevan un halo. Colores:
 * `--color-secundario` (lejanas) y `--color-primario`. Estático
 * (miniatura/movimiento reducido): un fotograma con el parpadeo congelado.
 */
export function CampoEstrellas({
  velocidad,
  intensidad,
  interactivo,
  estatico,
  maxFps,
  ambito,
}: PropsFondoVisual) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const capas = useRef<CapaEstrellas[]>([])
  const objetivo = useRef({ px: 0, py: 0, scroll: 0 })
  const actual = useRef({ px: 0, py: 0, scroll: 0 })
  const f = factorIntensidad(intensidad)
  const velocidadRitmo = ritmo(velocidad)

  usePunteroRelativo(canvas, interactivo, (p) => {
    objetivo.current.px = p ? acotar(p.x - 0.5, -0.5, 0.5) : 0
    objetivo.current.py = p ? acotar(p.y - 0.5, -0.5, 0.5) : 0
  })
  useScrollRelativo(canvas, interactivo, ({ valor }) => {
    objetivo.current.scroll = valor
  })

  useBucleCanvas(canvas, {
    estatico,
    maxFps,
    clave: `${intensidad}`,
    preparar: (ancho, alto) => {
      const escalaArea = acotar((ancho * alto) / (1440 * 900), 0.5, 1.6)
      capas.current = CAPAS.map((c) => ({
        profundidad: c.profundidad,
        estrellas: Array.from(
          { length: Math.round(c.cantidad * escalaArea * f) },
          () => ({
            x: Math.random() * ancho,
            y: Math.random() * alto,
            radio: c.radio[0] + Math.random() * (c.radio[1] - c.radio[0]),
            fase: Math.random() * Math.PI * 2,
            brillo: 0.45 + Math.random() * 0.55,
          }),
        ),
      }))
    },
    dibujar: (ctx, { ancho, alto, t, dt, colores }) => {
      const suavizado = Math.min(1, dt * 4)
      const a = actual.current
      const o = objetivo.current
      a.px += (o.px - a.px) * suavizado
      a.py += (o.py - a.py) * suavizado
      a.scroll += (o.scroll - a.scroll) * suavizado

      ctx.clearRect(0, 0, ancho, alto)
      capas.current.forEach((capa, indice) => {
        const color = CAPAS[indice].color === 'primario' ? colores.primario : colores.secundario
        ctx.fillStyle = color
        const desplX = -a.px * capa.profundidad * 70
        const desplY =
          -a.py * capa.profundidad * 70 -
          a.scroll * capa.profundidad * 0.1 -
          t * 3 * capa.profundidad * velocidadRitmo
        for (const e of capa.estrellas) {
          const x = (((e.x + desplX) % ancho) + ancho) % ancho
          const y = (((e.y + desplY) % alto) + alto) % alto
          const parpadeo = 0.7 + 0.3 * Math.sin(t * 1.3 * velocidadRitmo + e.fase)
          const alfa = acotar(e.brillo * parpadeo, 0.1, 1)
          if (indice === CAPAS.length - 1) {
            ctx.globalAlpha = alfa * 0.18
            ctx.beginPath()
            ctx.arc(x, y, e.radio * 3.4, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = alfa
          ctx.beginPath()
          ctx.arc(x, y, e.radio, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.globalAlpha = 1
    },
  })

  return (
    <CapaFondo ambito={ambito}>
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </CapaFondo>
  )
}
