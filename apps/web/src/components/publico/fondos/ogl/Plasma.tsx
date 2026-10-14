import type { PropsFondoVisual } from '../utilidades'
import { LienzoShader } from './LienzoShader'
import { FRAGMENTO_PLASMA } from './shaders/plasma.glsl'

/** Plasma (Fase 7c, UC-15): ver el shader en `shaders/plasma.glsl.ts`. */
export function Plasma(props: PropsFondoVisual) {
  return <LienzoShader {...props} fragmento={FRAGMENTO_PLASMA} />
}
