/**
 * Piezas GLSL ES 1.0 compartidas por los fondos con shader (Fase 7c, UC-15).
 * Compatible con WebGL1: sin `texture2D` dinámico, sin índices de arreglo no
 * constantes ni operadores enteros. Los shaders de cada fondo están escritos
 * para este proyecto; las funciones de ruido son implementaciones propias de
 * técnicas públicas (ruido simplex 2D, fbm, tramado Bayer).
 */

export const VERTICE_PANTALLA = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

/**
 * Cabecera de todo fragment shader: precisión (alta si el dispositivo la
 * ofrece) y los `uniform` que `LienzoShader` actualiza en cada cuadro.
 * Colores como `vec3` en 0–1: `uColorA` primario, `uColorB` secundario y
 * `uColorC` fondo del tema; `uPuntero` en 0–1 con el origen abajo a la
 * izquierda (ya suavizado); `uClaro` vale 1 si el fondo del tema es claro.
 */
export const CABECERA_FRAGMENTO = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uIntensidad;
uniform vec2 uPuntero;
uniform float uClaro;
`

/** Ruido simplex 2D con gradientes por hash (rango aproximado −1…1) y fbm de dos o tres octavas. */
export const RUIDO_GLSL = /* glsl */ `
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float simplex(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(
    dot(a, hash2(i)),
    dot(b, hash2(i + o)),
    dot(c, hash2(i + 1.0))
  );
  return dot(n, vec3(70.0));
}

float fbm2(vec2 p) {
  return simplex(p) * 0.6 + simplex(p * 2.03 + 11.7) * 0.4;
}

float fbm3(vec2 p) {
  return simplex(p) * 0.55 + simplex(p * 2.03 + 11.7) * 0.3 + simplex(p * 4.01 + 23.1) * 0.15;
}
`
