import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilPublico } from '@/features/publico/types'
import { Footer } from './Footer'

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
  cv_media: null,
}

describe('Footer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-04T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra el nombre del perfil y el año actual', () => {
    render(<Footer perfil={PERFIL} />)

    expect(screen.getByText(/oscar burga/i)).toBeInTheDocument()
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  // Fase 4.7 (fix de visibilidad): el toggle de modo claro/oscuro se movió
  // fuera del Footer, a un botón flotante en `PublicHomePage`.
  it('ya no incluye el toggle de modo claro/oscuro (se movió a un botón flotante)', () => {
    render(<Footer perfil={PERFIL} />)

    expect(
      screen.queryByRole('button', { name: /cambiar a modo/i }),
    ).not.toBeInTheDocument()
  })

  // Fix 5ta ronda: los enlaces de redes sociales/CV se sacaron del Footer,
  // porque duplicaban exactamente el mismo contenido que la sección
  // `contacto` (`BloqueContacto`) ya muestra cuando el admin la agrega.
  it('ya no incluye enlaces de redes sociales ni el botón de descargar CV', () => {
    render(<Footer perfil={PERFIL} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('solo muestra el año cuando no hay perfil', () => {
    render(<Footer perfil={null} />)

    expect(screen.getByText(/^© 2026$/)).toBeInTheDocument()
  })
})
