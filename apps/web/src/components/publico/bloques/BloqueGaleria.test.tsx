import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { GaleriaConfiguracion, GaleriaFoto } from '@/features/secciones/types'
import { BloqueGaleria } from './BloqueGaleria'

/**
 * UC-18 (Fase 4.5, bloque `galeria`): cubre las dos disposiciones
 * (`carousel`/`grid`), que un click en una foto abre el lightbox, y el
 * mensaje de lista vacía (mismo criterio que `BloqueProyectos`/`BloqueLogros`
 * cuando no hay contenido).
 */

const FOTOS: GaleriaFoto[] = [
  {
    media_id: 'media-1',
    titulo: 'Primera foto',
    media: {
      id: 'media-1',
      url: 'https://ejemplo.com/foto-1.jpg',
      s3_key: 'foto-1.jpg',
      tipo: 'imagen',
      ancho: 800,
      alto: 600,
      alt_text: null,
      created_at: '2025-01-01T00:00:00.000Z',
    },
  },
  {
    media_id: 'media-2',
    titulo: 'Segunda foto',
    media: {
      id: 'media-2',
      url: 'https://ejemplo.com/foto-2.jpg',
      s3_key: 'foto-2.jpg',
      tipo: 'imagen',
      ancho: 800,
      alto: 600,
      alt_text: null,
      created_at: '2025-01-01T00:00:00.000Z',
    },
  },
]

function config(overrides: Partial<GaleriaConfiguracion> = {}): GaleriaConfiguracion {
  return { fotos: FOTOS, ...overrides }
}

describe('BloqueGaleria (UC-18)', () => {
  it('disposicion carousel (default) renderiza las fotos', () => {
    render(<BloqueGaleria titulo="Galería" config={config()} />)

    expect(screen.getByAltText('Primera foto')).toBeInTheDocument()
    expect(screen.getByAltText('Segunda foto')).toBeInTheDocument()
  })

  it('disposicion grid renderiza las fotos en una grilla', () => {
    render(<BloqueGaleria titulo="Galería" config={config({ disposicion: 'grid' })} />)

    expect(screen.getByAltText('Primera foto')).toBeInTheDocument()
    expect(screen.getByAltText('Segunda foto')).toBeInTheDocument()
  })

  it('click en una foto del carousel abre el lightbox en esa foto', async () => {
    const user = userEvent.setup()
    render(<BloqueGaleria titulo="Galería" config={config()} />)

    await user.click(screen.getByRole('button', { name: 'Segunda foto' }))

    // El lightbox muestra la MISMA foto en la que se hizo click (índice 1),
    // no siempre la primera — se verifica con el título visible dentro del
    // modal (`Lightbox`, cubierto en detalle en `Lightbox.test.tsx`).
    expect(
      screen.getByRole('dialog').textContent?.includes('Segunda foto'),
    ).toBe(true)
  })

  it('click en una foto de la grilla abre el lightbox', async () => {
    const user = userEvent.setup()
    render(<BloqueGaleria titulo="Galería" config={config({ disposicion: 'grid' })} />)

    await user.click(screen.getByRole('button', { name: 'Primera foto' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('sin fotos muestra el mensaje de lista vacía', () => {
    render(<BloqueGaleria titulo="Galería" config={config({ fotos: [] })} />)

    expect(screen.getByText('Todavía no hay fotos.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
