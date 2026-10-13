/**
 * Utilidades de SEO del sitio público (Fase 6, UC-12/UC-13).
 */

/**
 * Recorta `texto` a `max` caracteres (por defecto ~155, el largo que los
 * buscadores suelen mostrar de una meta description) sin cortar palabras:
 * colapsa espacios/saltos de línea y, si hay que recortar, corta en el último
 * espacio anterior al límite y agrega «…».
 */
export function recortarDescripcion(texto: string, max = 155): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= max) return limpio

  const corte = limpio.lastIndexOf(' ', max - 1)
  const base = corte > 0 ? limpio.slice(0, corte) : limpio.slice(0, max - 1)
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`
}

/** Convierte una URL (posiblemente relativa) en absoluta contra el origen actual. */
export function urlAbsoluta(url: string): string {
  try {
    return new URL(url, window.location.origin).toString()
  } catch {
    return url
  }
}

/** URL canónica de la página actual: origen + pathname, sin query ni hash. */
export function urlCanonicaActual(): string {
  return `${window.location.origin}${window.location.pathname}`
}
