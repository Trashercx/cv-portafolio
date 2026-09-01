import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CertificacionPublica } from '@/features/publico/types'
import { ApiError } from '@/lib/api-client'
import { CertificacionDetallePage } from './CertificacionDetallePage'

const CERTIFICACION: CertificacionPublica = {
  id: 'certificacion-1',
  usuario_admin_id: 'admin-1',
  nombre: 'AWS Certified Cloud Practitioner',
  institucion: 'Amazon Web Services',
  fecha_emision: '2024-01-01',
  fecha_expiracion: null,
  url_verificacion: 'https://verify.example.com/cert-1',
  credencial_id: null,
  logo_media_id: null,
  orden: 0,
  logo: null,
}

const useCertificacionPublicaMock = vi.fn()

vi.mock('@/features/publico/usePublico', () => ({
  useCertificacionPublica: (id?: string) => useCertificacionPublicaMock(id),
}))

function renderConId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/certificacion/${id}`]}>
      <Routes>
        <Route path="/certificacion/:id" element={<CertificacionDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CertificacionDetallePage (UC-13)', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el detalle de la certificación cuando existe en el snapshot publicado', () => {
    useCertificacionPublicaMock.mockReturnValue({
      data: CERTIFICACION,
      isLoading: false,
      error: null,
    })

    renderConId('certificacion-1')

    expect(
      screen.getByText('AWS Certified Cloud Practitioner'),
    ).toBeInTheDocument()
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /verificar credencial/i }),
    ).toHaveAttribute('href', 'https://verify.example.com/cert-1')
  })

  it('muestra un 404 amigable cuando la certificación no existe en lo publicado', () => {
    useCertificacionPublicaMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError('No existe', 404, '/certificaciones/no-existe'),
    })

    renderConId('no-existe')

    expect(
      screen.getByText(/no existe o todavía no está publicada/i),
    ).toBeInTheDocument()
  })
})
