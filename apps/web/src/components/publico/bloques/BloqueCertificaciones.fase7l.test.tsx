import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { CertificacionPublica } from '@/features/publico/types'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueCertificaciones } from './BloqueCertificaciones'

/**
 * Fase 7l (UC-04): tarjeta rediseñada (logo en marco, emisor, fechas, chip de
 * vigencia, "Ver credencial") y disposiciones `tarjetas`, `linea_tiempo` y
 * `logos`. La clave ausente conserva las tarjetas.
 */

const LOGO = {
  id: 'm1',
  url: 'https://cdn.example.com/aws.png',
  s3_key: 'k',
  tipo: 'imagen' as const,
  ancho: 200,
  alto: 200,
  alt_text: null,
  created_at: '2026-01-01T00:00:00.000Z',
  variantes: [{ formato: 'webp' as const, ancho: 640, alto: 640, url: 'https://cdn.example.com/aws-640.webp' }],
}

function cert(n: number, extra: Partial<CertificacionPublica> = {}): CertificacionPublica {
  return {
    id: `c${n}`,
    usuario_admin_id: 'admin-1',
    nombre: `Certificación ${n}`,
    institucion: `Emisor ${n}`,
    fecha_emision: '2024-06-15',
    fecha_expiracion: null,
    url_verificacion: `https://verify.example.com/${n}`,
    credencial_id: null,
    logo_media_id: null,
    orden: n,
    logo: null,
    ...extra,
  }
}

function renderCerts(
  config: Partial<Parameters<typeof BloqueCertificaciones>[0]['config']>,
  certificaciones: CertificacionPublica[],
  modo: 'publico' | 'editor' = 'publico',
) {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={modo}>
        <ProveedorDetallePublico>
          <BloqueCertificaciones
            titulo="Certificaciones"
            config={{ orden: 'manual', ...config }}
            certificaciones={certificaciones}
          />
        </ProveedorDetallePublico>
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueCertificaciones — vigencia (Fase 7l, UC-04)', () => {
  it('Vigente con expiración futura, Vencida con expiración pasada y Sin vencimiento sin fecha', () => {
    renderCerts({}, [
      cert(1, { fecha_expiracion: '2999-01-01' }),
      cert(2, { fecha_expiracion: '2001-01-01' }),
      cert(3),
    ])
    expect(screen.getByText('Vigente')).toHaveAttribute('data-chip', 'exito')
    expect(screen.getByText('Vencida')).toHaveAttribute('data-chip', 'aviso')
    expect(screen.getByText('Sin vencimiento')).toHaveAttribute('data-chip', 'neutro')
  })

  it('mostrar_vigencia=false oculta el chip', () => {
    renderCerts({ mostrar_vigencia: false }, [cert(1)])
    expect(document.querySelector('[data-chip]')).toBeNull()
  })
})

describe('BloqueCertificaciones — tarjeta (Fase 7l, UC-04)', () => {
  it('clave ausente: tarjetas con emisor, fecha y Ver credencial', () => {
    const { container } = renderCerts({}, [cert(1)])
    expect(container.querySelector('[data-disposicion="tarjetas"]')).toHaveClass('grid', 'lg:grid-cols-3')
    expect(screen.getByText('Emisor 1')).toBeInTheDocument()
    expect(screen.getByText(/Emitida/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver credencial de Certificación 1' })).toHaveAttribute(
      'href',
      'https://verify.example.com/1',
    )
  })

  it('muestra la fecha de expiración y respeta mostrar_emisor, mostrar_fecha y mostrar_enlace', () => {
    const { unmount } = renderCerts({}, [cert(1, { fecha_expiracion: '2999-01-01' })])
    expect(screen.getByText(/Expira/)).toBeInTheDocument()
    unmount()

    renderCerts({ mostrar_emisor: false, mostrar_fecha: false, mostrar_enlace: false }, [cert(2)])
    expect(screen.queryByText('Emisor 2')).not.toBeInTheDocument()
    expect(screen.queryByText(/Emitida/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('logo de imagen en marco cuadrado con ImagenResponsive; logo PDF con miniatura de la primera página (Fase 7m)', () => {
    const { container, unmount } = renderCerts({}, [cert(1, { logo: LOGO })])
    const marco = container.querySelector('[data-marco-logo]')
    expect(marco).toHaveClass('size-14')
    expect(marco?.querySelector('picture source[type="image/webp"]')).toBeInTheDocument()
    unmount()

    const pdf = renderCerts({}, [cert(2, { logo: { ...LOGO, tipo: 'documento' } })])
    expect(pdf.container.querySelector('[data-marco-logo] img')).toBeNull()
    // Fase 7m (#66): `MiniaturaPdf` ocupa el marco (skeleton hasta entrar en el viewport).
    expect(pdf.container.querySelector('[data-marco-logo] [data-estado]')).toBeInTheDocument()
  })

  it('url_verificacion nula o peligrosa no genera enlace', () => {
    renderCerts({}, [
      cert(1, { url_verificacion: null as unknown as string }),
      cert(2, { url_verificacion: 'javascript:alert(1)' }),
    ])
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('en el lienzo Ver credencial no navega', () => {
    renderCerts({}, [cert(1)], 'editor')
    const enlace = screen.getByRole('link', { name: 'Ver credencial de Certificación 1' })
    expect(enlace.tagName).toBe('DIV')
    expect(enlace).toHaveAttribute('aria-disabled', 'true')
  })

  it('pulsar la tarjeta abre el detalle y el enlace no está dentro del botón', async () => {
    const user = userEvent.setup()
    renderCerts({}, [cert(1)])
    const boton = screen.getByRole('button', { name: 'Certificación 1' })
    expect(within(boton).queryByRole('link')).toBeNull()
    await user.click(boton)
    expect(screen.getByRole('heading', { name: 'Certificación 1', level: 1 })).toBeInTheDocument()
  })
})

describe('BloqueCertificaciones — línea de tiempo (Fase 7l, UC-04)', () => {
  it('agrupa por año de emisión, con el orden elegido', () => {
    const { container } = renderCerts({ disposicion: 'linea_tiempo', orden: 'fecha' }, [
      cert(1, { fecha_emision: '2022-02-01' }),
      cert(2, { fecha_emision: '2024-02-01' }),
      cert(3, { fecha_emision: '2024-09-01' }),
    ])
    const eje = container.querySelector('[data-disposicion="linea_tiempo"]') as HTMLElement
    expect(eje.tagName).toBe('OL')
    const anios = Array.from(eje.querySelectorAll('[data-anio]')).map((n) => n.textContent)
    expect(anios).toEqual(['2024', '2022'])
    const primero = eje.querySelector('li')!
    expect(within(primero).getByRole('button', { name: 'Certificación 3' })).toBeInTheDocument()
    expect(within(primero).getByRole('button', { name: 'Certificación 2' })).toBeInTheDocument()
    expect(within(primero).queryByRole('button', { name: 'Certificación 1' })).toBeNull()
  })
})

describe('BloqueCertificaciones — muro de logos (Fase 7l, UC-04)', () => {
  it('cada logo es un botón con el nombre y la etiqueta visible al pasar o en táctil', () => {
    const { container } = renderCerts({ disposicion: 'logos' }, [
      cert(1, { logo: LOGO }),
      cert(2),
    ])
    expect(container.querySelector('[data-disposicion="logos"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Certificación 1' })).toHaveClass('size-24')
    const etiquetas = container.querySelectorAll('[data-etiqueta-logo]')
    expect(etiquetas).toHaveLength(2)
    expect(etiquetas[0]).toHaveClass('opacity-0', 'group-hover/logo:opacity-100', '[@media(hover:none)]:opacity-100')
    expect(etiquetas[0]).toHaveAttribute('aria-hidden', 'true')
    // Sin logo: inicial del nombre.
    expect(screen.getByRole('button', { name: 'Certificación 2' })).toHaveTextContent('C')
    // No pinta emisor ni enlaces.
    expect(screen.queryByText('Emisor 1')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('abre el detalle al pulsar un logo', async () => {
    const user = userEvent.setup()
    renderCerts({ disposicion: 'logos' }, [cert(1, { logo: LOGO })])
    await user.click(screen.getByRole('button', { name: 'Certificación 1' }))
    expect(screen.getByRole('heading', { name: 'Certificación 1', level: 1 })).toBeInTheDocument()
  })
})
