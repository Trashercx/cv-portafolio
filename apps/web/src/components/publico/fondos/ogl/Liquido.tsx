import type { PropsFondoVisual } from '../utilidades'
import { LienzoShader } from './LienzoShader'
import { FRAGMENTO_LIQUIDO } from './shaders/liquido.glsl'

/** Líquido (Fase 7c, UC-15): ver el shader en `shaders/liquido.glsl.ts`. */
export function Liquido(props: PropsFondoVisual) {
  return <LienzoShader {...props} fragmento={FRAGMENTO_LIQUIDO} />
}
