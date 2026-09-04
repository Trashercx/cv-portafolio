import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Media } from '@/features/media/types'
import type { PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import { Footer } from './Footer'

const CV_MEDIA: Media = {
  id: 'media-cv',
  url: 'https://cdn.example.com/cv.pdf',
  s3_key: 'cv.pdf',
  tipo: 'documento',
  ancho: null,
  alto: null,
  alt_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

const PERFIL: PerfilPublico = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Oscar Burga',
  titulo_profesional: 'Desarrollador Full Stack',
  resumen_bio: 'Bio',
  imagen_perfil_id: null,
  cv_media_id: 'media-cv',
  ubicacion: 'Lima, Perú',
  updated_at: '2026-01-01T00:00:00.000Z',
  imagen_perfil: null,
  cv_media: CV_MEDIA,
}

const RED: RedSocial = {
  id: 'red-1',
  usuario_admin_id: 'admin-1',
  plataforma_id: 'plataforma-1',
  url: 'https://github.com/oscar',
  orden: 0,
  plataforma: { id: 'plataforma-1', nombre: 'GitHub', icono_defecto: 'github' },
}

describe('Footer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-04T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra el nombre del perfil, el año actual y las redes sociales', () => {
    render(<Footer perfil={PERFIL} redes={[RED]} cvMedia={CV_MEDIA} />)

    expect(screen.getByText(/oscar burga/i)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /descargar cv/i }),
    ).toBeInTheDocument()
  })

  // Fase 4.7 (fix de visibilidad): el toggle de modo claro/oscuro se movió
  // fuera del Footer, a un botón flotante en `PublicHomePage`.
  it('ya no incluye el toggle de modo claro/oscuro (se movió a un botón flotante)', () => {
    render(<Footer perfil={PERFIL} redes={[RED]} cvMedia={CV_MEDIA} />)

    expect(
      screen.queryByRole('button', { name: /cambiar a modo/i }),
    ).not.toBeInTheDocument()
  })

  it('solo muestra el año cuando no hay perfil', () => {
    render(<Footer perfil={null} redes={[]} cvMedia={null} />)

    expect(screen.getByText(/^© 2026$/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
