import type { PropsFondoVisual } from '../utilidades'
import { LienzoShader } from './LienzoShader'
import { FRAGMENTO_AURORA } from './shaders/aurora.glsl'

/** Aurora boreal (Fase 7c, UC-15): ver el shader en `shaders/aurora.glsl.ts`. */
export function AuroraBoreal(props: PropsFondoVisual) {
  return <LienzoShader {...props} fragmento={FRAGMENTO_AURORA} />
}
