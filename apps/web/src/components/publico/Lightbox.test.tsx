import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GaleriaFoto } from '@/features/secciones/types'
import { Lightbox } from './Lightbox'

/** UC-18 (Fase 4.5): navegación con flechas/teclado dentro del modal, y cierre con `Escape`. */

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
  {
    media_id: 'media-3',
    titulo: 'Tercera foto',
    media: {
      id: 'media-3',
      url: 'https://ejemplo.com/foto-3.jpg',
      s3_key: 'foto-3.jpg',
      tipo: 'imagen',
      ancho: 800,
      alto: 600,
      alt_text: null,
      created_at: '2025-01-01T00:00:00.000Z',
    },
  },
]

describe('Lightbox (UC-18)', () => {
  it('muestra la foto en `indiceInicial` al abrirse', () => {
    render(
      <Lightbox fotos={FOTOS} indiceInicial={1} open onOpenChange={vi.fn()} />,
    )

    expect(screen.getByAltText('Segunda foto')).toBeInTheDocument()
  })

  it('la flecha "Foto siguiente" avanza a la próxima foto, con loop al llegar al final', async () => {
    const user = userEvent.setup()
    render(
      <Lightbox fotos={FOTOS} indiceInicial={0} open onOpenChange={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByAltText('Segunda foto')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByAltText('Tercera foto')).toBeInTheDocument()

    // Loop: después de la última vuelve a la primera.
    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByAltText('Primera foto')).toBeInTheDocument()
  })

  it('la flecha "Foto anterior" retrocede, con loop hacia la última al llegar al principio', async () => {
    const user = userEvent.setup()
    render(
      <Lightbox fotos={FOTOS} indiceInicial={0} open onOpenChange={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Foto anterior' }))
    expect(screen.getByAltText('Tercera foto')).toBeInTheDocument()
  })

  it('navega con las flechas del teclado (ArrowRight/ArrowLeft)', async () => {
    const user = userEvent.setup()
    render(
      <Lightbox fotos={FOTOS} indiceInicial={0} open onOpenChange={vi.fn()} />,
    )

    await user.keyboard('{ArrowRight}')
    expect(screen.getByAltText('Segunda foto')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByAltText('Primera foto')).toBeInTheDocument()
  })

  it('se cierra con Escape (dispara onOpenChange(false))', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Lightbox fotos={FOTOS} indiceInicial={0} open onOpenChange={onOpenChange} />,
    )

    await user.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reabrir en un índice distinto resincroniza la foto mostrada', () => {
    const { rerender } = render(
      <Lightbox fotos={FOTOS} indiceInicial={0} open={false} onOpenChange={vi.fn()} />,
    )

    rerender(
      <Lightbox fotos={FOTOS} indiceInicial={2} open onOpenChange={vi.fn()} />,
    )

    expect(screen.getByAltText('Tercera foto')).toBeInTheDocument()
  })
})
