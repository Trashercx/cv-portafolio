import { useEffect, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Doble de `@tsparticles/react` para jsdom (Fase 7c, UC-15): sin canvas ni
 * motor. `registroParticulas` permite a los tests comprobar montajes,
 * desmontajes y las opciones recibidas.
 */
export const registroParticulas = {
  montadas: 0,
  desmontadas: 0,
  /** Opciones de cada `<Particles>` montado, en orden de montaje. */
  opciones: [] as Array<Record<string, unknown>>,
  inits: [] as unknown[],
  reiniciar() {
    this.montadas = 0
    this.desmontadas = 0
    this.opciones = []
    this.inits = []
  },
}

export function ParticlesProvider({ children, init }: { children?: ReactNode; init: unknown }) {
  registroParticulas.inits.push(init)
  return <>{children}</>
}

export function Particles({ id, options }: { id?: string; options?: Record<string, unknown> }) {
  useEffect(() => {
    registroParticulas.montadas += 1
    if (options) registroParticulas.opciones.push(options)
    return () => {
      registroParticulas.desmontadas += 1
    }
  }, [options])
  return <div data-testid="particulas-mock" id={id} />
}

export default Particles
export const useParticlesProvider = vi.fn(() => ({ loaded: true }))
