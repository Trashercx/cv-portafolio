import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Media } from '@/features/media/types'
import { ImagenResponsive } from './ImagenResponsive'

const BASE: Media = {
  id: 'm1',
  url: 'https://cdn/foto.png',
  s3_key: 'k',
  tipo: 'imagen',
  ancho: 2000,
  alto: 1000,
  alt_text: null,
  created_at: '2024-01-01T00:00:00.000Z',
}

const CON_VARIANTES: Media = {
  ...BASE,
  variantes: [
    { formato: 'webp', ancho: 640, alto: 320, url: 'https://cdn/foto-640.webp' },
    { formato: 'avif', ancho: 640, alto: 320, url: 'https://cdn/foto-640.avif' },
    { formato: 'avif', ancho: 1024, alto: 512, url: 'https://cdn/foto-1024.avif' },
  ],
}

describe('ImagenResponsive (Fase 8, UC-34)', () => {
  it('con variantes renderiza picture con sources avif y webp e img con el original', () => {
    const { container } = render(
      <ImagenResponsive media={CON_VARIANTES} alt="Foto" sizes="100vw" className="rounded" />,
    )
    const fuentes = container.querySelectorAll('picture > source')
    expect(fuentes).toHaveLength(2)
    expect(fuentes[0]).toHaveAttribute('type', 'image/avif')
    expect(fuentes[0]).toHaveAttribute(
      'srcset',
      'https://cdn/foto-640.avif 640w, https://cdn/foto-1024.avif 1024w',
    )
    expect(fuentes[0]).toHaveAttribute('sizes', '100vw')
    expect(fuentes[1]).toHaveAttribute('type', 'image/webp')
    const img = container.querySelector('picture > img')!
    expect(img).toHaveAttribute('src', 'https://cdn/foto.png')
    expect(img).toHaveAttribute('alt', 'Foto')
    expect(img).toHaveAttribute('width', '2000')
    expect(img).toHaveAttribute('height', '1000')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveClass('rounded')
  })

  it('omite el source de un formato sin variantes', () => {
    const solo = { ...BASE, variantes: [CON_VARIANTES.variantes![0]] }
    const { container } = render(<ImagenResponsive media={solo} alt="" />)
    const fuentes = container.querySelectorAll('source')
    expect(fuentes).toHaveLength(1)
    expect(fuentes[0]).toHaveAttribute('type', 'image/webp')
  })

  it.each([undefined, []])('sin variantes (%s) renderiza un img simple', (variantes) => {
    const { container } = render(
      <ImagenResponsive media={{ ...BASE, variantes }} alt="Foto" sizes="50vw" />,
    )
    expect(container.querySelector('picture')).toBeNull()
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn/foto.png')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
  })

  it('prioridad usa loading eager y fetchpriority high', () => {
    const { container } = render(<ImagenResponsive media={CON_VARIANTES} alt="" prioridad />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
  })

  it('sin dimensiones no emite width/height y sin media renderiza img sin src', () => {
    const { container } = render(
      <ImagenResponsive media={{ ...BASE, ancho: null, alto: null }} alt="" />,
    )
    expect(container.querySelector('img')).not.toHaveAttribute('width')
    const vacio = render(<ImagenResponsive media={undefined} alt="x" />)
    expect(vacio.container.querySelector('img')).not.toHaveAttribute('src')
  })
})
