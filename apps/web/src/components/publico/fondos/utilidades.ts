import type {
  IntensidadFondo,
  VelocidadFondo,
} from '@/features/fondo-sitio/types'

/**
 * Utilidades compartidas por los fondos (Fase 7b, UC-15): duraciones por
 * velocidad y factores por intensidad. Sin colores: todo color sale de las
 * variables del tema (`--color-primario/--color-secundario/--color-fondo`).
 */

/** Props que el despachador `FondoAnimado` pasa a cada fondo. */
export type PropsFondoVisual = {
  velocidad: VelocidadFondo
  intensidad: IntensidadFondo
  /** Ya resuelto: solo `true` en modo `sitio`, con `interactivo` y sin movimiento reducido. */
  interactivo: boolean
  /** `true` en miniatura o con movimiento reducido: sin `requestAnimationFrame`, fotograma fijo. */
  estatico: boolean
  /** Tope de fotogramas por segundo de los canvas (30 en el lienzo del editor, 60 en el sitio). */
  maxFps: number
  /**
   * `pagina`: la capa se ancla al viewport (`fixed`, sitio y lienzo);
   * `caja`: ocupa solo su contenedor (miniaturas y vista previa del panel).
   */
  ambito: 'pagina' | 'caja'
}

const FACTOR_VELOCIDAD: Record<VelocidadFondo, number> = {
  lenta: 1.7,
  media: 1,
  rapida: 0.55,
}

const FACTOR_INTENSIDAD: Record<IntensidadFondo, number> = {
  sutil: 0.6,
  media: 1,
  alta: 1.45,
}

/** Duración (s) de un ciclo CSS: `base` es la duración a velocidad `media`. */
export function duracionSegundos(base: number, velocidad: VelocidadFondo): number {
  return base * (FACTOR_VELOCIDAD[velocidad] ?? 1)
}

/** `Ns` listo para `animation-duration`. */
export function duracionCss(base: number, velocidad: VelocidadFondo): string {
  return `${duracionSegundos(base, velocidad).toFixed(2)}s`
}

/** Multiplicador de velocidad para canvas (inverso de la duración: `rapida` > 1). */
export function ritmo(velocidad: VelocidadFondo): number {
  return 1 / (FACTOR_VELOCIDAD[velocidad] ?? 1)
}

/** Factor de densidad/tamaño/contraste según la intensidad (`media` = 1). */
export function factorIntensidad(intensidad: IntensidadFondo): number {
  return FACTOR_INTENSIDAD[intensidad] ?? 1
}

export function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

export type ColoresFondo = { primario: string; secundario: string; fondo: string }

/**
 * Resuelve las variables del tema tal como las ve `el` (heredadas del
 * contenedor que las define). Los canvas no entienden `var()`, por eso se
 * leen con `getComputedStyle`. Si faltan (p. ej. jsdom) se usa el `color`
 * computado del elemento, nunca un valor fijo.
 */
export function leerColoresTema(el: Element): ColoresFondo {
  const estilo = getComputedStyle(el)
  const respaldo = estilo.color || 'currentColor'
  const leer = (nombre: string) => estilo.getPropertyValue(nombre).trim() || respaldo
  return {
    primario: leer('--color-primario'),
    secundario: leer('--color-secundario'),
    fondo: leer('--color-fondo'),
  }
}
