import { describe, expect, it } from 'vitest'
import type { VarianteMedia } from '@/features/media/types'
import { fondoImagenSet, SIZES_POR_CONTEXTO, srcsetDe } from './imagenes'

const VARIANTES: VarianteMedia[] = [
  { formato: 'webp', ancho: 1024, alto: 768, url: 'https://cdn/x-1024.webp' },
  { formato: 'webp', ancho: 640, alto: 480, url: 'https://cdn/x-640.webp' },
  { formato: 'avif', ancho: 640, alto: 480, url: 'https://cdn/x-640.avif' },
  { formato: 'avif', ancho: 1024, alto: 768, url: 'https://cdn/x-1024.avif' },
]

describe('imagenes (Fase 8, UC-34)', () => {
  it('srcsetDe ordena por ancho y filtra por formato', () => {
    expect(srcsetDe({ variantes: VARIANTES }, 'webp')).toBe(
      'https://cdn/x-640.webp 640w, https://cdn/x-1024.webp 1024w',
    )
    expect(srcsetDe({ variantes: VARIANTES }, 'jpeg')).toBe('')
  })

  it('tolera variantes ausentes o vacías', () => {
    expect(srcsetDe({}, 'avif')).toBe('')
    expect(srcsetDe({ variantes: [] }, 'avif')).toBe('')
  })

  it('fondoImagenSet usa la variante más ancha de cada formato y el original como respaldo', () => {
    expect(fondoImagenSet({ url: 'https://cdn/x.png', variantes: VARIANTES })).toBe(
      'image-set(url("https://cdn/x-1024.avif") type("image/avif"), url("https://cdn/x-1024.webp") type("image/webp"), url("https://cdn/x.png"))',
    )
  })

  it('fondoImagenSet sin variantes devuelve url() simple', () => {
    expect(fondoImagenSet({ url: 'https://cdn/x.png' })).toBe('url("https://cdn/x.png")')
  })

  it('SIZES_POR_CONTEXTO cubre todos los contextos', () => {
    expect(Object.keys(SIZES_POR_CONTEXTO).sort()).toEqual(
      [
        'certificacion_logo',
        'detalle',
        'galeria',
        'hero_fondo',
        'hero_foto',
        'insignia', // Fase 7d (UC-35)
        'lightbox',
        'proyecto_tarjeta',
        'sobre_mi',
      ].sort(),
    )
    expect(SIZES_POR_CONTEXTO.hero_fondo).toBe('100vw')
  })
})
