import type { CSSProperties } from 'react'
import type { Media, VarianteMedia } from '@/features/media/types'

/**
 * Utilidades de imágenes responsive (Fase 8, 8.2; UC-12/UC-34).
 * Todas toleran `variantes` ausente (snapshots anteriores a la Fase 8).
 */

type Formato = VarianteMedia['formato']

/** Variantes de un formato, de menor a mayor ancho. */
function variantesDe(media: Pick<Media, 'variantes'>, formato: Formato): VarianteMedia[] {
  return (media.variantes ?? [])
    .filter((v) => v.formato === formato)
    .sort((a, b) => a.ancho - b.ancho)
}

/** `srcset` de un formato (`"url 640w, url 1024w"`); `''` si no hay variantes. */
export function srcsetDe(media: Pick<Media, 'variantes'>, formato: Formato): string {
  return variantesDe(media, formato)
    .map((v) => `${v.url} ${v.ancho}w`)
    .join(', ')
}

/**
 * Valor de `background-image` con `image-set()` (hero con imagen de fondo).
 *
 * En React no se pueden emitir dos declaraciones `background-image` (una de
 * respaldo y otra con `image-set`), así que el respaldo va dentro de la propia
 * lista: el último `url()` sin `type()` es el original. Se usa la variante más
 * ancha de cada formato. Sin variantes devuelve el `url()` simple del original.
 */
export function fondoImagenSet(
  media: Pick<Media, 'url' | 'variantes'>,
): CSSProperties['backgroundImage'] {
  const original = `url("${media.url}")`
  const opciones: string[] = []
  for (const [formato, mime] of [
    ['avif', 'image/avif'],
    ['webp', 'image/webp'],
  ] as const) {
    const lista = variantesDe(media, formato)
    const mayor = lista[lista.length - 1]
    if (mayor) opciones.push(`url("${mayor.url}") type("${mime}")`)
  }
  if (opciones.length === 0) return original
  return `image-set(${[...opciones, original].join(', ')})`
}

/**
 * `sizes` por contexto de uso, con los breakpoints de Tailwind (sm 640,
 * md 768, lg 1024, xl 1280). Tabla literal compartida por lienzo y sitio.
 */
export const SIZES_POR_CONTEXTO = {
  hero_fondo: '100vw',
  hero_foto: '(min-width: 1024px) 28rem, (min-width: 640px) 20rem, 80vw',
  sobre_mi: '(min-width: 1024px) 28rem, (min-width: 640px) 50vw, 100vw',
  proyecto_tarjeta: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  galeria: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  certificacion_logo: '6rem',
  // Fase 7d (UC-35): la insignia más grande (`tamano: 'grande'`) mide 13 rem.
  insignia: '(min-width: 640px) 13rem, 10rem',
  detalle: '(min-width: 1024px) 56rem, 100vw',
  lightbox: '100vw',
} as const

export type ContextoSizes = keyof typeof SIZES_POR_CONTEXTO
