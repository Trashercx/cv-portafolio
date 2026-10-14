import type { ImgHTMLAttributes } from 'react'
import type { Media } from '@/features/media/types'
import { srcsetDe } from '@/lib/imagenes'

type ImagenResponsiveProps = {
  /** Tolera `null`/`undefined` (foto de galería con referencia rota): `<img>` sin `src`. */
  media: Pick<Media, 'url' | 'ancho' | 'alto' | 'variantes'> | null | undefined
  alt: string
  /** Valor de `SIZES_POR_CONTEXTO`. */
  sizes?: string
  className?: string
  /** Solo para la imagen LCP del hero: `loading="eager"` + `fetchPriority="high"`. */
  prioridad?: boolean
} & Pick<ImgHTMLAttributes<HTMLImageElement>, 'style' | 'draggable' | 'onClick'>

/**
 * Imagen con variantes AVIF/WebP (Fase 8, 8.2; UC-34). `<picture>` con un
 * `<source>` por formato y `<img>` con el original como respaldo. Sin
 * variantes (snapshots antiguos, SVG, GIF) renderiza un `<img>` simple con
 * los mismos atributos. Las clases van en el `<img>`, que es el elemento que
 * antes se renderizaba, así el layout existente no cambia.
 */
export function ImagenResponsive({
  media,
  alt,
  sizes,
  className,
  prioridad = false,
  ...resto
}: ImagenResponsiveProps) {
  const avif = media ? srcsetDe(media, 'avif') : ''
  const webp = media ? srcsetDe(media, 'webp') : ''

  const img = (
    <img
      src={media?.url}
      alt={alt}
      width={media?.ancho ?? undefined}
      height={media?.alto ?? undefined}
      sizes={avif || webp ? undefined : sizes}
      loading={prioridad ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={prioridad ? 'high' : undefined}
      className={className}
      {...resto}
    />
  )

  if (!avif && !webp) return img

  return (
    // `contents`: el `<picture>` no genera caja propia, así las clases de
    // layout del `<img>` (absolute, mx-auto, flex-1...) siguen igual.
    <picture className="contents">
      {avif ? <source type="image/avif" srcSet={avif} sizes={sizes} /> : null}
      {webp ? <source type="image/webp" srcSet={webp} sizes={sizes} /> : null}
      {img}
    </picture>
  )
}
