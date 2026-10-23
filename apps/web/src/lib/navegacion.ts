import type { NavegacionConfiguracion, Seccion } from '@/features/secciones/types'

/**
 * Utilidades del bloque `navegacion` (Fase 7, 7.2/7.3, UC-07 y UC-12). Los
 * enlaces no se configuran: se generan con las secciones visibles que tengan
 * título (`titulo_visible` no vacío), salvo `hero` y `navegacion`.
 *
 * Fase 7n (#73): el ancla de cada sección es un slug legible derivado de su
 * título (`#sobre-mi`, `#insignias`), estable mientras no cambie el título y
 * único dentro del sitio (`generarAnclasSecciones`). El formato anterior
 * `#seccion-{uuid}` se conserva solo como alias de entrada: `anclaSeccion`
 * sigue generándolo para el lienzo del editor (donde los ids son de Puck) y
 * `resolverAnclaHeredada` traduce un hash viejo al slug nuevo.
 */

/** Tipos que nunca aparecen como enlace del menú. */
const TIPOS_SIN_ENLACE: ReadonlySet<string> = new Set(['hero', 'navegacion'])

/**
 * Ids que ya existen o se usan en la página pública y que un slug no puede
 * pisar: `contenido` es el destino de "saltar al contenido", `top` el del
 * nombre en la barra de navegación (sin elemento: el navegador va arriba).
 */
const ANCLAS_RESERVADAS: ReadonlySet<string> = new Set([
  'contenido',
  'root',
  'top',
  'menu-navegacion-movil',
])

export type EnlaceNavegacion = {
  /** `Seccion.id` (o el `id` de Puck mientras la sección no está guardada). */
  id: string
  titulo: string
  /** `id` del elemento DOM de la sección (slug), sin `#`. */
  ancla: string
}

/**
 * `id` del elemento DOM de una sección en el formato anterior
 * (`seccion-{id}`). Lo usa el lienzo del editor (Puck) y la compatibilidad
 * con enlaces antiguos; el sitio público usa `generarAnclasSecciones`.
 */
export function anclaSeccion(id: string): string {
  return `seccion-${id}`
}

/**
 * Slug de un texto para usarlo como ancla: minúsculas, sin acentos ni
 * diacríticos (NFD), solo `[a-z0-9-]`, sin guiones repetidos ni en los
 * extremos. Devuelve `''` si no queda nada aprovechable.
 */
export function slugAncla(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type SeccionParaAncla = Pick<Seccion, 'id' | 'tipo_seccion' | 'titulo_visible' | 'visible'>

/**
 * Ancla (slug) de cada sección, indexada por `Seccion.id`, calculada sobre
 * las secciones que se pintan (`soloVisibles=false` en la vista previa del
 * panel incluye las ocultas) y en su orden. La base es el título visible y,
 * si no da slug, el tipo de sección; una repetición o un id reservado recibe
 * sufijo `-2`, `-3`… El sitio (`RenderizadorSecciones`) y el menú
 * (`generarEnlacesNavegacion`) llaman a esta misma función con los mismos
 * argumentos, así que ambos obtienen el mismo resultado por construcción.
 */
export function generarAnclasSecciones(
  secciones: SeccionParaAncla[],
  soloVisibles = true,
): Record<string, string> {
  const usadas = new Set<string>(ANCLAS_RESERVADAS)
  const anclas: Record<string, string> = {}
  for (const seccion of secciones) {
    if (soloVisibles && !seccion.visible) continue
    const base = slugAncla(seccion.titulo_visible) || slugAncla(seccion.tipo_seccion) || 'seccion'
    let ancla = base
    for (let n = 2; usadas.has(ancla); n += 1) ancla = `${base}-${n}`
    usadas.add(ancla)
    anclas[seccion.id] = ancla
  }
  return anclas
}

/**
 * Enlaces del menú a partir de las secciones EN ORDEN (el llamador ya las
 * ordenó). `soloVisibles=false` (vista previa del panel) incluye también las
 * ocultas.
 */
export function generarEnlacesNavegacion(
  secciones: SeccionParaAncla[],
  soloVisibles = true,
): EnlaceNavegacion[] {
  const anclas = generarAnclasSecciones(secciones, soloVisibles)
  return secciones
    .filter(
      (seccion) =>
        !TIPOS_SIN_ENLACE.has(seccion.tipo_seccion) &&
        (!soloVisibles || seccion.visible) &&
        seccion.titulo_visible.trim() !== '',
    )
    .map((seccion) => ({
      id: seccion.id,
      titulo: seccion.titulo_visible.trim(),
      ancla: anclas[seccion.id],
    }))
}

/**
 * Traduce el `hash` de la URL al ancla de una sección: `#sobre-mi` devuelve
 * `sobre-mi` si existe; el formato antiguo `#seccion-{id}` (enlaces ya
 * compartidos antes de la Fase 7n) devuelve el slug de esa sección. `null`
 * si el hash no apunta a ninguna sección conocida.
 */
export function resolverAnclaHeredada(
  hash: string,
  anclas: Record<string, string>,
): { ancla: string; heredada: boolean } | null {
  let valor: string
  try {
    valor = decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    // Hash malformado (`#100%`): cualquiera puede escribirlo en la URL y no
    // debe tumbar la página.
    return null
  }
  if (valor === '') return null
  if (Object.values(anclas).includes(valor)) return { ancla: valor, heredada: false }
  const id = valor.startsWith('seccion-') ? valor.slice('seccion-'.length) : null
  if (id && anclas[id]) return { ancla: anclas[id], heredada: true }
  return null
}

/**
 * ¿La home pública debe ocultar el `ToggleModoTema` fijo de la esquina? Sí si
 * hay un bloque `navegacion` visible que ya trae su propio toggle
 * (`mostrar_toggle_modo`, default `true`).
 */
export function navegacionReemplazaToggle(
  secciones: Pick<Seccion, 'tipo_seccion' | 'visible' | 'configuracion'>[],
): boolean {
  return secciones.some(
    (seccion) =>
      seccion.tipo_seccion === 'navegacion' &&
      seccion.visible &&
      ((seccion.configuracion as NavegacionConfiguracion).mostrar_toggle_modo ?? true),
  )
}
