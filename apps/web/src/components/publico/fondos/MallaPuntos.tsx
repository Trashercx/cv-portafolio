import { useRef } from 'react'
import { CapaFondo } from './CapaFondo'
import { usePunteroRelativo } from './hooks/usePunteroRelativo'
import { duracionCss, factorIntensidad, type PropsFondoVisual } from './utilidades'

const PASO_PX = 30

/**
 * Malla de puntos con foco (Fase 7b, UC-15). Dos rejillas de puntos CSS
 * idénticas: una tenue que cubre todo y otra brillante (`--color-primario`,
 * puntos más grandes) visible solo dentro de una "linterna" (`mask-image`
 * radial) cuyo centro son las variables `--mx/--my`. Con puntero la linterna
 * lo sigue; sin puntero (táctil, `interactivo=false`, movimiento reducido o
 * antes del primer movimiento) queda quieta cerca del centro y "respira" con
 * una animación de opacidad. Un resplandor suave con `--color-secundario`
 * acompaña a la linterna para dar profundidad.
 */
export function MallaPuntos({ velocidad, intensidad, interactivo, ambito }: PropsFondoVisual) {
  const capa = useRef<HTMLDivElement>(null)
  usePunteroRelativo(capa, interactivo, (p) => {
    const el = capa.current
    if (!el) return
    if (p) {
      el.style.setProperty('--mx', `${Math.round(p.px)}px`)
      el.style.setProperty('--my', `${Math.round(p.py)}px`)
    } else {
      el.style.removeProperty('--mx')
      el.style.removeProperty('--my')
    }
  })
  const f = factorIntensidad(intensidad)
  const radioPunto = (base: number) => (base * (0.8 + 0.2 * f)).toFixed(2)
  const puntos = (color: string, radio: string) =>
    `radial-gradient(circle at center, ${color} ${radio}px, transparent calc(${radio}px + 0.6px))`
  const radioLinterna = Math.round(190 + 70 * f)
  const mascara = `radial-gradient(circle ${radioLinterna}px at var(--mx, 50%) var(--my, 38%), black 0%, transparent 100%)`

  return (
    <CapaFondo ambito={ambito} capaRef={capa}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: puntos(
            'color-mix(in srgb, var(--color-primario) 38%, transparent)',
            radioPunto(1.1),
          ),
          backgroundSize: `${PASO_PX}px ${PASO_PX}px`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle ${radioLinterna}px at var(--mx, 50%) var(--my, 38%), color-mix(in srgb, var(--color-secundario) ${Math.round(16 * f)}%, transparent), transparent)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: puntos('var(--color-primario)', radioPunto(1.9)),
          backgroundSize: `${PASO_PX}px ${PASO_PX}px`,
          maskImage: mascara,
          WebkitMaskImage: mascara,
          animation: `malla-respirar ${duracionCss(6, velocidad)} ease-in-out infinite alternate`,
        }}
      />
    </CapaFondo>
  )
}
