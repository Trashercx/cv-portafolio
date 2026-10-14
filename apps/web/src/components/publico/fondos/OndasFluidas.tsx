import { useMemo, useRef } from 'react'
import { CapaFondo } from './CapaFondo'
import { useScrollRelativo } from './hooks/useScrollRelativo'
import {
  acotar,
  duracionCss,
  factorIntensidad,
  type PropsFondoVisual,
} from './utilidades'

const ANCHO_PERIODO = 1440
const ALTO_VIEWBOX = 400
const LINEA_MEDIA = 130

/**
 * Camino SVG de una onda que se repite exactamente cada `ANCHO_PERIODO`
 * unidades y se dibuja dos veces seguidas: al trasladar el `<svg>` (200 % de
 * ancho) un 50 % el bucle no tiene salto. Cada medio ciclo es una curva
 * cuadrática (el punto de control a `2 * amplitud` da un pico de `amplitud`).
 */
export function construirCaminoOnda(ciclos: number, amplitud: number): string {
  const tramo = ANCHO_PERIODO / (ciclos * 2)
  const tramos = ciclos * 2 * 2
  let d = `M0 ${LINEA_MEDIA}`
  for (let i = 0; i < tramos; i++) {
    const x = (i + 1) * tramo
    const controlY = LINEA_MEDIA + (i % 2 === 0 ? -2 : 2) * amplitud
    d += ` Q${(x - tramo / 2).toFixed(1)} ${controlY.toFixed(1)} ${x.toFixed(1)} ${LINEA_MEDIA}`
  }
  return `${d} L${ANCHO_PERIODO * 2} ${ALTO_VIEWBOX} L0 ${ALTO_VIEWBOX} Z`
}

type CapaOnda = {
  /** Alto de la capa respecto al viewport (clases literales). */
  clase: string
  ciclos: number
  amplitud: number
  relleno: string
  opacidad: number
  /** Segundos por ciclo de traslación (a velocidad `media`). */
  base: number
  inversa?: boolean
  /** Píxeles que sube la capa a lo largo de todo el scroll (parallax vertical). */
  parallax: number
  /** Segundos del "respiro" de amplitud. */
  respiro: number
}

const CAPAS: CapaOnda[] = [
  { clase: 'h-[62%]', ciclos: 2, amplitud: 34, relleno: 'var(--color-secundario)', opacidad: 0.3, base: 44, parallax: 40, respiro: 9 },
  { clase: 'h-[50%]', ciclos: 3, amplitud: 26, relleno: 'var(--color-primario)', opacidad: 0.3, base: 32, inversa: true, parallax: 90, respiro: 7 },
  { clase: 'h-[40%]', ciclos: 4, amplitud: 20, relleno: 'color-mix(in srgb, var(--color-primario) 75%, var(--color-fondo))', opacidad: 0.45, base: 24, parallax: 150, respiro: 5.5 },
]

/**
 * Ondas fluidas (Fase 7b, UC-15). Tres capas SVG `<path>` apiladas abajo:
 * cada una se traslada en bucle (sentidos y ritmos distintos), "respira"
 * (la amplitud sube y baja con un `scaleY` desde la base) y, con scroll,
 * sube a distinta velocidad (parallax vertical por `--sy`; las capas sobresalen un 20 % por debajo para no dejar hueco al subir, escrito desde
 * `useScrollRelativo`). Un lavado vertical con `--color-secundario` suaviza
 * la parte alta. Rellenos con las variables del tema, nunca colores fijos.
 */
export function OndasFluidas({ velocidad, intensidad, interactivo, ambito }: PropsFondoVisual) {
  const capa = useRef<HTMLDivElement>(null)
  useScrollRelativo(capa, interactivo, ({ progreso }) => {
    capa.current?.style.setProperty('--sy', progreso.toFixed(4))
  })
  const f = factorIntensidad(intensidad)
  const caminos = useMemo(
    () => CAPAS.map((c) => construirCaminoOnda(c.ciclos, c.amplitud * (0.75 + 0.25 * f))),
    [f],
  )

  return (
    <CapaFondo ambito={ambito} capaRef={capa}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, color-mix(in srgb, var(--color-secundario) 14%, transparent), transparent 55%)',
        }}
      />
      {CAPAS.map((c, i) => (
        <div
          key={c.clase}
          className={`absolute inset-x-0 will-change-transform ${c.clase}`}
          style={{
            bottom: '-20%',
            transform: `translate3d(0, calc(var(--sy, 0) * -${c.parallax}px), 0)`,
            transition: 'transform 250ms ease-out',
          }}
        >
          <div
            className="h-full origin-bottom"
            style={{
              animation: `onda-respirar ${duracionCss(c.respiro, velocidad)} ease-in-out infinite alternate`,
            }}
          >
            <svg
              viewBox={`0 0 ${ANCHO_PERIODO * 2} ${ALTO_VIEWBOX}`}
              preserveAspectRatio="none"
              className="block h-full w-[200%] max-w-none"
              style={{
                animation: `onda-desplazar ${duracionCss(c.base, velocidad)} linear infinite${c.inversa ? ' reverse' : ''}`,
              }}
              focusable="false"
            >
              <path
                d={caminos[i]}
                style={{ fill: c.relleno, opacity: acotar(c.opacidad * f, 0.1, 0.9) }}
              />
            </svg>
          </div>
        </div>
      ))}
    </CapaFondo>
  )
}
