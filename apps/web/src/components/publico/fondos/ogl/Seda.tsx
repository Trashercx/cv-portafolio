import type { PropsFondoVisual } from '../utilidades'
import { LienzoShader } from './LienzoShader'
import { FRAGMENTO_SEDA } from './shaders/seda.glsl'

/** Seda (Fase 7c, UC-15): ver el shader en `shaders/seda.glsl.ts`. */
export function Seda(props: PropsFondoVisual) {
  return <LienzoShader {...props} fragmento={FRAGMENTO_SEDA} />
}
