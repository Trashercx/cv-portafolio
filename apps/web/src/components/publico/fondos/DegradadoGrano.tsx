import { useId } from 'react'
import { CapaFondo } from './CapaFondo'
import {
  acotar,
  duracionCss,
  factorIntensidad,
  type PropsFondoVisual,
} from './utilidades'

/**
 * Degradado con grano (Fase 7b, UC-15). Capa base: degradado diagonal
 * `--color-primario` → `--color-secundario` → `--color-fondo` a 300 % de
 * tamaño que fluye en bucle (`gradient-shift`); encima, un resplandor radial
 * en deriva para que no se vea plano y una textura de grano SVG
 * (`feTurbulence`) ESTÁTICA con `mix-blend-mode: overlay`: se rasteriza una
 * vez, por lo que no cuesta nada durante la animación. La intensidad regula
 * el contraste del grano. No interactivo.
 */
export function DegradadoGrano({ velocidad, intensidad, ambito }: PropsFondoVisual) {
  const f = factorIntensidad(intensidad)
  // `useId` devuelve caracteres no válidos en una referencia `url(#...)` en algunos navegadores.
  const idFiltro = `grano-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <CapaFondo ambito={ambito}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(125deg, var(--color-primario), var(--color-secundario) 45%, var(--color-fondo) 85%)',
          backgroundSize: '300% 300%',
          animation: `gradient-shift ${duracionCss(20, velocidad)} ease-in-out infinite`,
        }}
      />
      <div
        className="absolute -inset-[15%] will-change-transform"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-secundario) 55%, transparent), transparent 55%), radial-gradient(circle at 75% 70%, color-mix(in srgb, var(--color-primario) 45%, transparent), transparent 50%)',
          animation: `aurora-deriva-a ${duracionCss(26, velocidad)} ease-in-out infinite alternate`,
        }}
      />
      <svg
        className="absolute inset-0 size-full"
        style={{ mixBlendMode: 'overlay', opacity: acotar(0.4 * f, 0.18, 0.7) }}
        focusable="false"
      >
        <filter id={idFiltro} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${idFiltro})`} />
      </svg>
    </CapaFondo>
  )
}
