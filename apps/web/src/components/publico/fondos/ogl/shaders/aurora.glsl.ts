import { CABECERA_FRAGMENTO, RUIDO_GLSL } from './comun.glsl'

/**
 * Aurora boreal (Fase 7c, UC-15): tres cortinas de luz superpuestas. Cada
 * una sigue una curva dada por ruido simplex que evoluciona con el tiempo,
 * tiene el borde inferior nítido y se difumina hacia arriba, y se modula con
 * rayos verticales (ruido de alta frecuencia en x). Con puntero, las
 * cortinas se desplazan en parallax (cada una con distinta profundidad). Los
 * colores se mezclan sobre el fondo del tema, así que valen en claro y oscuro.
 */
export const FRAGMENTO_AURORA = /* glsl */ `${CABECERA_FRAGMENTO}
${RUIDO_GLSL}
void main() {
  vec2 uv = vUv;
  vec2 par = (uPuntero - 0.5) * 0.18;
  float t = uTime * 0.12;
  vec3 col = uColorC;

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x = uv.x * (1.5 + fi * 0.55) + par.x * (1.0 + fi * 0.8) + fi * 7.3;
    float curva = simplex(vec2(x, t * (1.0 + fi * 0.35)));
    float centro = 0.62 - fi * 0.11 + curva * 0.16 + par.y * (0.6 + fi * 0.4);
    float d = uv.y - centro;
    // Borde inferior nítido, fundido suave hacia arriba.
    float forma = d > 0.0 ? exp(-d * 5.5) : exp(d * 30.0);
    float rayos = 0.55 + 0.45 * simplex(vec2(uv.x * 16.0 + fi * 3.1 + par.x * 4.0, t * 2.2 + fi));
    float alfa = clamp(forma * rayos * 0.85 * uIntensidad, 0.0, 1.0);
    vec3 tinte = mix(uColorA, uColorB, clamp(fi * 0.4 + 0.3 + 0.35 * curva, 0.0, 1.0));
    col = mix(col, tinte, alfa * (0.8 + 0.2 * uClaro));
  }

  gl_FragColor = vec4(col, 1.0);
}
`
