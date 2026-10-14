import type { PropsFondoVisual } from '../utilidades'
import { LienzoShader } from './LienzoShader'
import { FRAGMENTO_ONDAS_DITHER } from './shaders/ondas-dither.glsl'

/** Ondas dither (Fase 7c, UC-15): ver el shader en `shaders/ondas-dither.glsl.ts`. */
export function OndasDither(props: PropsFondoVisual) {
  return <LienzoShader {...props} fragmento={FRAGMENTO_ONDAS_DITHER} />
}
