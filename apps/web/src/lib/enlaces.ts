/**
 * Enlace de un botón con URL libre (Fase 7, UC-12), p. ej. `enlace_boton` del
 * hero. El API guarda ese campo como texto libre (compatibilidad con datos ya
 * guardados), así que acá se valida al renderizar: solo `http(s)://`,
 * `mailto:`, ruta interna `/x` (no `//host` ni `/\host`, que el navegador
 * resuelve como otro origen) y ancla `#x`. Cualquier otro valor
 * (`javascript:`, `data:`, esquema desconocido, vacío) devuelve `null`.
 */
export type EnlaceSeguro =
  | { to: string }
  | { href: string }
  | { href: string; target: '_blank'; rel: 'noreferrer' }

export function resolverEnlaceSeguro(url: string | undefined): EnlaceSeguro | null {
  const valor = (url ?? '').trim()
  if (valor === '') return null
  if (valor.startsWith('/')) {
    return /^\/[\\/]/.test(valor) ? null : { to: valor }
  }
  if (valor.startsWith('#')) return { href: valor }
  if (/^mailto:/i.test(valor)) return { href: valor }
  if (/^https?:\/\//i.test(valor)) return { href: valor, target: '_blank', rel: 'noreferrer' }
  return null
}
