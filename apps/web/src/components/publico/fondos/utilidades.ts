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
  /** `true` solo con movimiento reducido: sin `requestAnimationFrame`, fotograma fijo (en miniatura ya no, novena ronda). */
  estatico: boolean
  /** Tope de fotogramas por segundo de los canvas (20 en miniatura, 30 en el lienzo del editor, 60 en el sitio). */
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

export type ColoresFondo = {
  primario: string
  secundario: string
  fondo: string
  /** `true` si `fondo` es claro (ver `esFondoClaro`): los canvas suben alfa y oscurecen trazos. */
  claro: boolean
}

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
  const fondo = leer('--color-fondo')
  return {
    primario: leer('--color-primario'),
    secundario: leer('--color-secundario'),
    fondo,
    claro: esFondoClaro(fondo),
  }
}

/** Interpreta `#rgb`, `#rrggbb` y `rgb()/rgba()` (lo que devuelve `getComputedStyle`). `null` si no se entiende. */
export function analizarColor(color: string): { r: number; g: number; b: number } | null {
  const texto = color.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(texto)) {
    return {
      r: parseInt(texto[1] + texto[1], 16),
      g: parseInt(texto[2] + texto[2], 16),
      b: parseInt(texto[3] + texto[3], 16),
    }
  }
  if (/^#[0-9a-f]{6}$/.test(texto)) {
    return {
      r: parseInt(texto.slice(1, 3), 16),
      g: parseInt(texto.slice(3, 5), 16),
      b: parseInt(texto.slice(5, 7), 16),
    }
  }
  const m = texto.match(/^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/)
  return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : null
}

/**
 * `true` si el color de fondo del tema es claro (luminancia relativa WCAG
 * > 0,5). Los canvas lo usan para subir alfa y oscurecer los trazos: sobre
 * fondo claro los blancos/pálidos y las alfas bajas quedan invisibles
 * (QA visual Fase 7b). Un color ilegible se trata como oscuro.
 */
export function esFondoClaro(colorFondo: string): boolean {
  const rgb = analizarColor(colorFondo)
  if (!rgb) return false
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((canal) => {
    const c = canal / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5
}

/** Mezcla `color` con negro (`cantidad` 0–1) para obtener un tono más oscuro y saturado a la vista. */
export function oscurecerColor(color: string, cantidad: number): string {
  const rgb = analizarColor(color)
  if (!rgb) return color
  const k = 1 - acotar(cantidad, 0, 1)
  return `rgb(${Math.round(rgb.r * k)}, ${Math.round(rgb.g * k)}, ${Math.round(rgb.b * k)})`
}
