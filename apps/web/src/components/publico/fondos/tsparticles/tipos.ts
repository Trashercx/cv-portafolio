import type { ComponentProps } from 'react'
import type { Particles } from '@tsparticles/react'

/** Opciones de tsparticles sin depender de `@tsparticles/engine` (solo es dependencia par del wrapper). */
export type OpcionesParticulas = NonNullable<ComponentProps<typeof Particles>['options']>

/** Colores del tema ya normalizados a `rgb()`; sobre fondo claro vienen oscurecidos. */
export type ColoresParticulas = {
  primario: string
  secundario: string
  fondo: string
  claro: boolean
}

/** Lo que cada fondo necesita saber para armar sus opciones (Fase 7c, UC-15). */
export type ContextoParticulas = {
  colores: ColoresParticulas
  /** Escala un número base de partículas por intensidad (50/100/160 %), modo (miniatura 40 %) y área de la ventana. */
  cantidad: (base: number) => number
  /** Multiplicador de velocidad (`lenta` < 1 < `rapida`). */
  ritmo: number
  miniatura: boolean
}

/** Modos de puntero de una capa: solo se activan con `interactivo` y en modo `sitio`. */
export type InteractividadCapa = {
  modo: 'grab' | 'repulse' | 'bubble'
  modos: Record<string, unknown>
}

/** Una capa = una instancia de `<Particles>` (las estrellas fugaces usan dos: cielo y trazos). */
export type CapaParticulas = {
  /** Valor de `options.particles` de tsparticles. */
  particulas: Record<string, unknown>
  interactividad?: InteractividadCapa
}

export type ConstructorCapas = (contexto: ContextoParticulas) => CapaParticulas[]
