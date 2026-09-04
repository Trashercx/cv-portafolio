import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CertificacionPublica } from '@/features/publico/types'
import { DetalleCertificacionContenido } from './DetalleCertificacionContenido'

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

describe('DetalleCertificacionContenido (Fase 4.3)', () => {
  it('renderiza nombre, institución y el botón de verificación', () => {
    render(<DetalleCertificacionContenido certificacion={CERTIFICACION} />)

    expect(
      screen.getByRole('heading', {
        name: 'AWS Certified Cloud Practitioner',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /verificar credencial/i }),
    ).toHaveAttribute('href', 'https://verify.example.com/cert-1')
  })
})
