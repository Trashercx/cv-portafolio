import { vi } from 'vitest'

/**
 * Doble de `ogl` para jsdom (Fase 7c, UC-15): jsdom no tiene WebGL. Registra
 * renderers, programas y la liberación del contexto (`WEBGL_lose_context`).
 */
type ValorUniform = { value: unknown }

export const registroOgl = {
  renderers: [] as MockRenderer[],
  programas: [] as MockProgram[],
  loseContext: vi.fn(),
  /** `true`: el constructor de `Renderer` lanza, como si WebGL no existiera. */
  sinWebGL: false,
  reiniciar() {
    this.renderers = []
    this.programas = []
    this.loseContext.mockClear()
    this.sinWebGL = false
  },
}

export class Renderer {
  dpr: number
  opciones: Record<string, unknown>
  gl: {
    canvas: HTMLCanvasElement
    drawingBufferWidth: number
    drawingBufferHeight: number
    getExtension: (nombre: string) => { loseContext: () => void } | null
  }
  setSize = vi.fn()
  render = vi.fn()

  constructor(opciones: { canvas: HTMLCanvasElement; dpr?: number } & Record<string, unknown>) {
    if (registroOgl.sinWebGL) throw new Error('WebGL no disponible')
    this.opciones = opciones
    this.dpr = opciones.dpr ?? 1
    this.gl = {
      canvas: opciones.canvas,
      drawingBufferWidth: 320,
      drawingBufferHeight: 200,
      getExtension: (nombre) =>
        nombre === 'WEBGL_lose_context' ? { loseContext: registroOgl.loseContext } : null,
    }
    registroOgl.renderers.push(this)
  }
}
type MockRenderer = Renderer

export class Program {
  uniforms: Record<string, ValorUniform>
  fragment: string
  constructor(
    _gl: unknown,
    { uniforms, fragment }: { uniforms: Record<string, ValorUniform>; fragment: string },
  ) {
    this.uniforms = uniforms
    this.fragment = fragment
    registroOgl.programas.push(this)
  }
}
type MockProgram = Program

export class Triangle {
  constructor(_gl: unknown) {}
}

export class Mesh {
  constructor(_gl: unknown, _opciones: unknown) {}
}
