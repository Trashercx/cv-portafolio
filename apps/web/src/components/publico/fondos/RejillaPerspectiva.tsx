import { useRef } from 'react'
import { CapaFondo } from './CapaFondo'
import { usePunteroRelativo } from './hooks/usePunteroRelativo'
import {
  acotar,
  duracionCss,
  factorIntensidad,
  type PropsFondoVisual,
} from './utilidades'

const PASO_PX = 64

/**
 * Rejilla en perspectiva (Fase 7b, UC-15). Un plano con líneas de cuadrícula
 * (`--color-primario`) inclinado con `rotateX` dentro de un contenedor con
 * `perspective`; el `background-position` del plano avanza en bucle (un paso
 * exacto de la rejilla, por eso el bucle no tiene salto) y una máscara lo
 * desvanece hacia el horizonte. Sobre el horizonte hay un resplandor con
 * `--color-secundario` y un cielo muy tenue. El punto de fuga
 * (`perspective-origin`) se desplaza levemente con el puntero (`--px/--py`).
 */
export function RejillaPerspectiva({ velocidad, intensidad, interactivo, ambito }: PropsFondoVisual) {
  const capa = useRef<HTMLDivElement>(null)
  usePunteroRelativo(capa, interactivo, (p) => {
    capa.current?.style.setProperty('--px', p ? String(acotar(p.x * 2 - 1, -1, 1)) : '0')
    capa.current?.style.setProperty('--py', p ? String(acotar(p.y * 2 - 1, -1, 1)) : '0')
  })
  const f = factorIntensidad(intensidad)
  const linea = `color-mix(in srgb, var(--color-primario) ${Math.round(55 * f)}%, transparent)`
  const lineaFuerte = `color-mix(in srgb, var(--color-secundario) ${Math.round(70 * f)}%, transparent)`
  const mascara = 'linear-gradient(to bottom, transparent 0%, black 45%)'

  return (
    <CapaFondo ambito={ambito} capaRef={capa}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, color-mix(in srgb, var(--color-primario) 14%, transparent), transparent 42%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          perspective: '520px',
          perspectiveOrigin:
            'calc(50% + var(--px, 0) * 7%) calc(38% + var(--py, 0) * 4%)',
          transition: 'perspective-origin 700ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        <div
          className="absolute -left-[70%] -right-[70%] top-[38%] h-[220%] origin-top will-change-[background-position]"
          style={{
            transform: 'rotateX(66deg)',
            backgroundImage: `linear-gradient(to right, ${lineaFuerte} 2px, transparent 2px), linear-gradient(to bottom, ${lineaFuerte} 2px, transparent 2px), linear-gradient(to right, ${linea} 1px, transparent 1px), linear-gradient(to bottom, ${linea} 1px, transparent 1px)`,
            backgroundSize: `${PASO_PX * 4}px ${PASO_PX * 4}px, ${PASO_PX * 4}px ${PASO_PX * 4}px, ${PASO_PX}px ${PASO_PX}px, ${PASO_PX}px ${PASO_PX}px`,
            maskImage: mascara,
            WebkitMaskImage: mascara,
            animation: `rejilla-avance ${duracionCss(4, velocidad)} linear infinite`,
          }}
        />
      </div>
      <div
        className="absolute inset-x-0 top-[28%] h-[22%]"
        style={{
          backgroundImage: `radial-gradient(ellipse 60% 100% at 50% 50%, color-mix(in srgb, var(--color-secundario) ${Math.round(38 * f)}%, transparent), transparent)`,
        }}
      />
    </CapaFondo>
  )
}
