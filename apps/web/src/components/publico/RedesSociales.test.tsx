import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Media } from '@/features/media/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import { RedesSociales } from './RedesSociales'

const REDES: RedSocial[] = [
  {
    id: 'red-1',
    usuario_admin_id: 'admin-1',
    plataforma_id: 'plat-1',
    url: 'https://github.com/octocat',
    orden: 0,
    plataforma: { id: 'plat-1', nombre: 'GitHub', icono_defecto: 'github' },
  },
]

const CV: Media = {
  id: 'cv',
  url: 'https://cdn/cv.pdf',
  s3_key: 'cv.pdf',
  tipo: 'pdf',
  ancho: null,
  alto: null,
  alt_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('RedesSociales — eventos de analítica (Fase 8, UC-14/UC-27)', () => {
  afterEach(() => {
    delete window.umami
  })

  it('clic en una red registra clic_red con la plataforma y conserva el href', async () => {
    const track = vi.fn()
    window.umami = { track }
    render(<RedesSociales redes={REDES} cvMedia={null} />)

    const enlace = screen.getByRole('link', { name: /github/i })
    await userEvent.setup().click(enlace)

    expect(track).toHaveBeenCalledWith('clic_red', { red: 'GitHub' })
    expect(enlace).toHaveAttribute('href', 'https://github.com/octocat')
  })

  it('clic en Descargar CV registra descargar_cv', async () => {
    const track = vi.fn()
    window.umami = { track }
    render(<RedesSociales redes={[]} cvMedia={CV} />)

    await userEvent.setup().click(screen.getByRole('link', { name: 'Descargar CV' }))

    expect(track).toHaveBeenCalledWith('descargar_cv', undefined)
  })

  it('sin tracker los enlaces funcionan igual (no-op)', async () => {
    render(<RedesSociales redes={REDES} cvMedia={null} />)
    await expect(
      userEvent.setup().click(screen.getByRole('link', { name: /github/i })),
    ).resolves.toBeUndefined()
  })
})
