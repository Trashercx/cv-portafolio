import { vi } from 'vitest'

/**
 * Doble de `@tsparticles/engine` para jsdom (Fase 7c, UC-15): sin canvas ni
 * motor. `registroParticulas` permite a los tests comprobar qué elemento y
 * qué opciones recibe `tsParticles.load` y cuándo se destruye cada contenedor.
 */
export const registroParticulas = {
  /** Contenedores cargados (`load`). */
  montadas: 0,
  /** Contenedores destruidos (`destroy`). */
  desmontadas: 0,
  /** Opciones de cada `load`, en orden. */
  opciones: [] as Array<Record<string, unknown>>,
  /** `element` recibido en cada `load`, en orden. */
  elementos: [] as Array<HTMLElement | undefined>,
  destroy: vi.fn(),
  reiniciar() {
    this.montadas = 0
    this.desmontadas = 0
    this.opciones = []
    this.elementos = []
    this.destroy.mockClear()
  },
}

export const tsParticles = {
  load: vi.fn(async (params: { element?: HTMLElement; options?: Record<string, unknown> }) => {
    registroParticulas.montadas += 1
    registroParticulas.elementos.push(params.element)
    if (params.options) registroParticulas.opciones.push(params.options)
    return {
      destroy: () => {
        registroParticulas.desmontadas += 1
        registroParticulas.destroy()
      },
    }
  }),
}
