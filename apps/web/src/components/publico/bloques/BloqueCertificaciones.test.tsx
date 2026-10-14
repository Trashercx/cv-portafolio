import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { CertificacionPublica } from '@/features/publico/types'
import { BloqueCertificaciones } from './BloqueCertificaciones'

/**
 * Fase 4.3 (detalle en modal): en modo público (default de
 * `useModoRenderizado`), un click en la tarjeta abre el detalle de la
 * certificación en el modal de `ProveedorDetallePublico` en vez de navegar
 * a `/certificacion/:id`. El comportamiento en modo `'editor'` se verifica
 * en `bloques-modo-editor.test.tsx`.
 */

const CERTIFICACION: CertificacionPublica = {
  id: 'cert-1',
  usuario_admin_id: 'admin-1',
  nombre: 'AWS Certified Cloud Practitioner',
  institucion: 'Amazon Web Services',
  fecha_emision: '2025-01-01',
  fecha_expiracion: null,
  url_verificacion: 'https://verify.example.com/cert-1',
  credencial_id: null,
  logo_media_id: null,
  orden: 0,
  logo: null,
}

describe('BloqueCertificaciones (Fase 7e, UC-04: sin vencimiento)', () => {
  it('con mostrar_fecha indica "Sin vencimiento" si no hay fecha de expiración', () => {
    render(
      <BloqueCertificaciones
        titulo="Certificaciones"
        config={{ orden: 'manual', mostrar_fecha: true }}
        certificaciones={[CERTIFICACION]}
      />,
    )
    expect(screen.getByText(/Sin vencimiento/)).toBeInTheDocument()
  })

  it('no lo indica si la certificación tiene expiración ni si mostrar_fecha es false', () => {
    const { rerender } = render(
      <BloqueCertificaciones
        titulo="Certificaciones"
        config={{ orden: 'manual', mostrar_fecha: true }}
        certificaciones={[{ ...CERTIFICACION, fecha_expiracion: '2030-01-01' }]}
      />,
    )
    expect(screen.queryByText(/Sin vencimiento/)).not.toBeInTheDocument()

    rerender(
      <BloqueCertificaciones
        titulo="Certificaciones"
        config={{ orden: 'manual', mostrar_fecha: false }}
        certificaciones={[CERTIFICACION]}
      />,
    )
    expect(screen.queryByText(/Sin vencimiento/)).not.toBeInTheDocument()
  })
})

describe('BloqueCertificaciones (Fase 4.3, detalle en modal)', () => {
  it('click en la tarjeta abre el modal con el detalle de la certificación', async () => {
    const user = userEvent.setup()
    render(
      <ProveedorDetallePublico>
        <BloqueCertificaciones
          titulo="Certificaciones"
          config={{ orden: 'fecha' }}
          certificaciones={[CERTIFICACION]}
        />
      </ProveedorDetallePublico>,
    )

    expect(
      screen.queryByRole('heading', {
        name: 'AWS Certified Cloud Practitioner',
        level: 1,
      }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'AWS Certified Cloud Practitioner' }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'AWS Certified Cloud Practitioner',
        level: 1,
      }),
    ).toBeInTheDocument()
  })
})
