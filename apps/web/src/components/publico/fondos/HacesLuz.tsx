import { useRef, type CSSProperties } from 'react'
import { CapaFondo } from './CapaFondo'
import { usePunteroRelativo } from './hooks/usePunteroRelativo'
import {
  acotar,
  duracionCss,
  factorIntensidad,
  type PropsFondoVisual,
} from './utilidades'

type Haz = {
  /** Posición horizontal y ancho (clases literales). */
  clase: string
  color: 'var(--color-primario)' | 'var(--color-secundario)'
  /** Inclinación de reposo (grados). */
  angulo: number
  /** Segundos por oscilación completa a velocidad `media`. */
  base: number
  retraso: number
}

const HACES: Haz[] = [
  { clase: 'left-[8%] w-[15%]', color: 'var(--color-primario)', angulo: 20, base: 13, retraso: 0 },
  { clase: 'left-[32%] w-[10%]', color: 'var(--color-secundario)', angulo: 26, base: 17, retraso: -4 },
  { clase: 'left-[56%] w-[16%]', color: 'var(--color-primario)', angulo: 17, base: 15, retraso: -8 },
  { clase: 'left-[80%] w-[10%]', color: 'var(--color-secundario)', angulo: 23, base: 19, retraso: -2 },
]

/**
 * Haces de luz (Fase 7b, UC-15). Cuatro haces diagonales con degradado
 * lineal que se desvanece hacia abajo, suavizados con `blur`, que oscilan
 * alrededor de su inclinación de reposo (variable `--ang`) y "respiran" en
 * opacidad con desfases distintos. Todo el conjunto se inclina hacia el
 * puntero (`rotate` según `--px`, con transición) y un resplandor en la parte
 * alta con `--color-primario` hace de fuente. Colores solo del tema.
 */
export function HacesLuz({ velocidad, intensidad, interactivo, ambito }: PropsFondoVisual) {
  const capa = useRef<HTMLDivElement>(null)
  usePunteroRelativo(capa, interactivo, (p) => {
    capa.current?.style.setProperty('--px', p ? String(acotar(p.x * 2 - 1, -1, 1)) : '0')
  })
  const f = factorIntensidad(intensidad)

  return (
    <CapaFondo ambito={ambito} capaRef={capa}>
      <div
        className="absolute inset-x-0 top-0 h-[45%]"
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 90% at 50% 0%, color-mix(in srgb, var(--color-primario) ${Math.round(30 * f)}%, transparent), transparent)`,
        }}
      />
      <div
        className="absolute inset-0 origin-[50%_-10%]"
        style={{
          transform: 'rotate(calc(var(--px, 0) * 5deg))',
          transition: 'transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {HACES.map((h) => (
          <div
            key={h.clase}
            className={`absolute -top-[12%] h-[150%] origin-top will-change-transform ${h.clase}`}
            style={
              {
                '--ang': `${h.angulo}deg`,
                backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${h.color} 85%, transparent), transparent 82%)`,
                filter: 'blur(16px)',
                opacity: acotar(0.55 * f, 0.25, 0.95),
                animation: `haz-oscilar ${duracionCss(h.base, velocidad)} ease-in-out ${h.retraso}s infinite alternate`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </CapaFondo>
  )
}
