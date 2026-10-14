import { CABECERA_FRAGMENTO, RUIDO_GLSL } from './comun.glsl'

/**
 * Líquido (Fase 7c, UC-15): ruido fluido con alabeo de dominio (el ruido se
 * usa para desplazar las coordenadas de otro ruido, dos niveles), lo que
 * produce remolinos continuos. Con puntero, las coordenadas se empujan lejos
 * del cursor con una campana gaussiana: el fluido se "aparta" a su paso.
 * Mezcla los dos colores del tema sobre el fondo.
 */
export const FRAGMENTO_LIQUIDO = /* glsl */ `${CABECERA_FRAGMENTO}
${RUIDO_GLSL}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y * 1.6;
  vec2 foco = (uPuntero - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * 1.6;
  float t = uTime * 0.12;

  // El cursor empuja el fluido.
  vec2 d = p - foco;
  p += d * exp(-dot(d, d) * 3.2) * 0.45;

  vec2 q = vec2(fbm2(p + vec2(0.0, t)), fbm2(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm2(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.7), fbm2(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.6));
  float f = 0.5 + 0.5 * fbm3(p + 3.2 * r);

  vec3 fluido = mix(uColorA, uColorB, clamp(f * f * 1.6, 0.0, 1.0));
  float cuerpo = clamp((0.25 + 0.65 * smoothstep(0.2, 0.95, f)) * uIntensidad, 0.0, 1.0);
  vec3 col = mix(uColorC, fluido, cuerpo);
  // Borde de remolino: línea fina más clara donde q y r divergen.
  col = mix(col, uColorB, clamp(length(q - r) * 0.35, 0.0, 1.0) * 0.18 * uIntensidad);

  gl_FragColor = vec4(col, 1.0);
}
`
