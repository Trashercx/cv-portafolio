import type { NavegacionConfiguracion, Seccion } from '@/features/secciones/types'

/**
 * Utilidades del bloque `navegacion` (Fase 7, 7.2/7.3, UC-07 y UC-12). Los
 * enlaces no se configuran: se generan con las secciones visibles que tengan
 * título (`titulo_visible` no vacío), salvo `hero` y `navegacion`; el ancla
 * de cada una es `#seccion-{id}` (la pone `EnvoltorioSeccion`).
 */

/** Tipos que nunca aparecen como enlace del menú. */
const TIPOS_SIN_ENLACE: ReadonlySet<string> = new Set(['hero', 'navegacion'])

export type EnlaceNavegacion = {
  /** `Seccion.id` (o el `id` de Puck mientras la sección no está guardada). */
  id: string
  titulo: string
}

/** `id` del elemento DOM de una sección, destino de los enlaces del menú. */
export function anclaSeccion(id: string): string {
  return `seccion-${id}`
}

type SeccionParaEnlace = Pick<Seccion, 'id' | 'tipo_seccion' | 'titulo_visible' | 'visible'>

/**
 * Enlaces del menú a partir de las secciones EN ORDEN (el llamador ya las
 * ordenó). `soloVisibles=false` (vista previa del panel) incluye también las
 * ocultas.
 */
export function generarEnlacesNavegacion(
  secciones: SeccionParaEnlace[],
  soloVisibles = true,
): EnlaceNavegacion[] {
  return secciones
    .filter(
      (seccion) =>
        !TIPOS_SIN_ENLACE.has(seccion.tipo_seccion) &&
        (!soloVisibles || seccion.visible) &&
        seccion.titulo_visible.trim() !== '',
    )
    .map((seccion) => ({ id: seccion.id, titulo: seccion.titulo_visible.trim() }))
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
