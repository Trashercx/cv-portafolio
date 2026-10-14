import { CABECERA_FRAGMENTO, RUIDO_GLSL } from './comun.glsl'

/**
 * Ondas dither (Fase 7c, UC-15): ondas suaves cuyo valor (0–1) se cuantiza
 * con una matriz de Bayer 4×4 sobre celdas de 3 px, dando el tramado retro
 * de los gráficos de 1 bit. Hay dos umbrales: el primero pinta el color
 * primario sobre el fondo del tema y el segundo el color secundario en las
 * crestas. Con puntero, una onda circular parte del cursor y empuja el valor.
 */
export const FRAGMENTO_ONDAS_DITHER = /* glsl */ `${CABECERA_FRAGMENTO}
${RUIDO_GLSL}

// Matriz de Bayer 4x4 en forma compacta (valores 0–1).
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec2 foco = (uPuntero - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime * 0.18;

  float ola = sin(p.x * 2.2 + t + 1.2 * sin(p.y * 1.6 - t * 0.7));
  ola += 0.6 * sin(p.y * 3.0 + 1.5 * simplex(vec2(p.x * 0.8, t * 0.4)));
  float v = 0.5 + 0.25 * ola;

  float d = length(p - foco);
  v += 0.18 * sin(d * 20.0 - t * 4.0) * exp(-d * 2.2);
  v = clamp((v - 0.5) * uIntensidad + 0.5, 0.0, 1.0);

  float umbral = bayer4(gl_FragCoord.xy / 3.0);
  // Degradado liso entre ondas; el tramado solo aporta ~40 % por encima.
  vec3 base = mix(uColorC, mix(uColorA, uColorB, smoothstep(0.4, 0.9, v)), smoothstep(0.3, 0.8, v) * 0.45);
  vec3 tramado = uColorC;
  tramado = mix(tramado, uColorA, step(umbral, v - 0.3));
  tramado = mix(tramado, uColorB, step(umbral, v - 0.65));
  vec3 col = mix(base, tramado, 0.4 * smoothstep(0.35, 0.6, v));

  gl_FragColor = vec4(col, 1.0);
}
`
