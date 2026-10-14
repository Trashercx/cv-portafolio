import { CABECERA_FRAGMENTO } from './comun.glsl'

/**
 * Plasma (Fase 7c, UC-15): senos superpuestos clásicos (horizontal, vertical,
 * diagonal y radial) cuya suma se mapea a una mezcla entre los dos colores
 * del tema. Con puntero, un frente de onda circular parte del cursor y la
 * zona cercana brilla más (efecto "foco").
 */
export const FRAGMENTO_PLASMA = /* glsl */ `${CABECERA_FRAGMENTO}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec2 foco = (uPuntero - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime * 0.6;

  float v = sin(p.x * 7.0 + t);
  v += sin((p.y * 7.0 + t) * 0.5);
  v += sin((p.x * 7.0 + p.y * 7.0 + t) * 0.5);
  vec2 c = p + 0.5 * vec2(sin(t * 0.33), cos(t * 0.5));
  v += sin(sqrt(dot(c, c) * 60.0 + 1.0) + t);

  float d = length(p - foco);
  float onda = sin(d * 18.0 - t * 2.5) / (1.0 + d * 5.0);
  v += onda * 1.2;

  float f = 0.5 + 0.5 * sin(v * 1.5707963);
  vec3 plasma = mix(uColorA, uColorB, f);
  float cuerpo = clamp((0.35 + 0.4 * f) * uIntensidad, 0.0, 1.0);
  float luz = exp(-d * d * 7.0) * 0.28;
  vec3 col = mix(uColorC, plasma, clamp(cuerpo + luz, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
`
