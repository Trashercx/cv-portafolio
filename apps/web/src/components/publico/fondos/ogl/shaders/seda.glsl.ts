import { CABECERA_FRAGMENTO } from './comun.glsl'

/**
 * Seda (Fase 7c, UC-15): pliegues ondulantes tipo tela. Las coordenadas se
 * deforman con tres pasadas de senos entrelazados (dominio alabeado) y el
 * resultado se interpreta como una altura: el sombreado sale de mezclar los
 * dos colores del tema según la altura y de un brillo especular estrecho en
 * las crestas, que da el aspecto satinado. Sin puntero.
 */
export const FRAGMENTO_SEDA = /* glsl */ `${CABECERA_FRAGMENTO}
void main() {
  vec2 p = gl_FragCoord.xy / uResolution.y * 2.6;
  float t = uTime * 0.22;
  float v = 0.0;

  for (int i = 0; i < 3; i++) {
    float fi = float(i + 1);
    p += vec2(sin(p.y * 1.4 * fi + t + v), cos(p.x * 1.2 * fi - t * 0.8 - v)) * (0.42 / fi);
    v += sin(p.x * 1.6 + p.y * 1.1 + t * fi) * 0.5;
  }

  float altura = 0.5 + 0.5 * sin(p.x * 2.2 + p.y * 1.5 + v * 2.4);
  float brillo = pow(altura, 7.0);
  float sombra = pow(1.0 - altura, 2.0);

  vec3 tela = mix(uColorA, uColorB, smoothstep(0.15, 0.9, altura));
  float cuerpo = clamp((0.35 + 0.4 * altura) * uIntensidad, 0.0, 1.0);
  vec3 col = mix(uColorC, tela, cuerpo);
  // Crestas más claras y valles más hondos; sobre fondo claro el brillo oscurece menos.
  col = mix(col, uColorB, brillo * 0.35 * uIntensidad);
  col = mix(col, uColorC, sombra * 0.28 * (1.0 - uClaro * 0.4));

  gl_FragColor = vec4(col, 1.0);
}
`
