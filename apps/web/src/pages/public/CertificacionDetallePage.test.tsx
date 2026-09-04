import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('cuando el logo es un PDF (feedback externo, UC-04), lo muestra como documento verificable en vez de un <img> roto', async () => {
    useCertificacionPublicaMock.mockReturnValue({
      data: {
        ...CERTIFICACION,
        logo_media_id: 'media-pdf',
        logo: {
          id: 'media-pdf',
          url: 'https://cdn.example.com/certificado.pdf',
          s3_key: 'certificado.pdf',
          tipo: 'pdf',
          ancho: null,
          alto: null,
          alt_text: null,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      },
      isLoading: false,
      error: null,
    })
    const user = userEvent.setup()

    renderConId('certificacion-1')

    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ver documento/i }))

    // `<object data type="application/pdf">` en vez de `<iframe sandbox>`
    // (ver comentario en MediaPreview.tsx).
    const objeto = document.querySelector('object[type="application/pdf"]')
    expect(objeto).toHaveAttribute('data', 'https://cdn.example.com/certificado.pdf')

    const enlaces = screen.getAllByRole('link', { name: /abrir en pestaña nueva/i })
    expect(enlaces.length).toBeGreaterThanOrEqual(1)
    enlaces.forEach((enlace) =>
      expect(enlace).toHaveAttribute('href', 'https://cdn.example.com/certificado.pdf'),
    )
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
