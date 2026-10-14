import { useRef, type CSSProperties } from 'react'
import { CapaFondo } from './CapaFondo'
import { usePunteroRelativo } from './hooks/usePunteroRelativo'
import {
  acotar,
  duracionCss,
  factorIntensidad,
  type PropsFondoVisual,
} from './utilidades'

type Mancha = {
  /** Posición y tamaño (clases literales). */
  clase: string
  color: 'var(--color-primario)' | 'var(--color-secundario)'
  animacion: 'aurora-deriva-a' | 'aurora-deriva-b' | 'aurora-deriva-c'
  base: number
  invertir?: boolean
}

const MANCHAS_FONDO: Mancha[] = [
  { clase: '-left-[12%] -top-[18%] h-[78%] w-[62%]', color: 'var(--color-primario)', animacion: 'aurora-deriva-a', base: 26 },
  { clase: '-right-[14%] top-[6%] h-[72%] w-[56%]', color: 'var(--color-secundario)', animacion: 'aurora-deriva-b', base: 31 },
]

const MANCHAS_FRENTE: Mancha[] = [
  { clase: 'left-[22%] -bottom-[24%] h-[72%] w-[58%]', color: 'var(--color-primario)', animacion: 'aurora-deriva-c', base: 28, invertir: true },
  { clase: '-right-[4%] -bottom-[12%] h-[52%] w-[40%]', color: 'var(--color-secundario)', animacion: 'aurora-deriva-a', base: 22, invertir: true },
  { clase: '-left-[6%] top-[34%] h-[46%] w-[36%]', color: 'var(--color-secundario)', animacion: 'aurora-deriva-b', base: 34 },
]

const SUAVIZADO_PARALLAX = 'transform 700ms cubic-bezier(0.22, 0.61, 0.36, 1)'

/**
 * Aurora mesh (Fase 7b, UC-15). Cinco manchas de luz con degradado radial
 * (el "blur" sale del propio degradado, sin `filter` caro) en deriva lenta,
 * un degradado cónico que gira muy despacio y una viñeta con `--color-fondo`
 * para dar profundidad. Dos planos de manchas (fondo y frente) se desplazan
 * distinto con el puntero: parallax suave por variables CSS `--px/--py`
 * escritas desde `usePunteroRelativo` (sin renders de React).
 */
export function AuroraMesh({ velocidad, intensidad, interactivo, ambito }: PropsFondoVisual) {
  const capa = useRef<HTMLDivElement>(null)
  usePunteroRelativo(capa, interactivo, (p) => {
    capa.current?.style.setProperty('--px', p ? String(acotar(p.x * 2 - 1, -1, 1)) : '0')
    capa.current?.style.setProperty('--py', p ? String(acotar(p.y * 2 - 1, -1, 1)) : '0')
  })
  const f = factorIntensidad(intensidad)
  const opacidad = acotar(0.6 * f, 0.3, 1)

  const pintar = (m: Mancha, i: number) => (
    <div
      key={`${m.clase}-${i}`}
      className={`absolute rounded-full will-change-transform ${m.clase}`}
      style={{
        backgroundImage: `radial-gradient(closest-side, ${m.color}, transparent)`,
        opacity: opacidad,
        animation: `${m.animacion} ${duracionCss(m.base, velocidad)} ease-in-out infinite alternate${m.invertir ? '-reverse' : ''}`,
      }}
    />
  )

  const plano = (profundidad: number): CSSProperties => ({
    transform: `translate3d(calc(var(--px, 0) * ${profundidad}px), calc(var(--py, 0) * ${profundidad}px), 0)`,
    transition: SUAVIZADO_PARALLAX,
  })

  return (
    <CapaFondo ambito={ambito} capaRef={capa}>
      <div className="absolute -inset-[10%]" style={plano(-12)}>
        <div className="absolute -inset-[10%]" style={{ opacity: 0.32 * f }}>
          <div
            className="size-full rounded-full"
            style={{
              backgroundImage:
                'conic-gradient(from 0deg, var(--color-primario), transparent 28%, var(--color-secundario) 52%, transparent 78%, var(--color-primario))',
              maskImage: 'radial-gradient(closest-side, black 20%, transparent)',
              WebkitMaskImage: 'radial-gradient(closest-side, black 20%, transparent)',
              animation: `aurora-giro ${duracionCss(90, velocidad)} linear infinite`,
            }}
          />
        </div>
        {MANCHAS_FONDO.map(pintar)}
      </div>
      <div className="absolute -inset-[10%]" style={plano(26)}>
        {MANCHAS_FRENTE.map(pintar)}
      </div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, transparent 45%, color-mix(in srgb, var(--color-fondo) 70%, transparent) 100%)',
        }}
      />
    </CapaFondo>
  )
}
