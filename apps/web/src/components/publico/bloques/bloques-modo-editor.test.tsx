import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Proyecto } from '@/features/proyectos/types'
import type { CertificacionPublica } from '@/features/publico/types'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueCertificaciones } from './BloqueCertificaciones'
import { BloqueProyectos } from './BloqueProyectos'

/**
 * Red de seguridad de navegación (Fase 3.1, `EnlaceBloque`): dentro del
 * lienzo de Puck el `Router` de react-router sigue montado (`createPortal`
 * conserva el árbol de contexto de React dentro del iframe), así que un
 * `<Link>`/`<a>` real navegaría fuera del editor si no se intercepta. Este
 * archivo verifica los dos bloques con enlaces navegables (proyectos y
 * certificaciones) en ambos modos.
 */

const PROYECTO: Proyecto = {
  id: 'proyecto-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Portafolio',
  descripcion: 'Sitio de portafolio personal',
  url_demo: null,
  url_repositorio: null,
  fecha_inicio: '2025-01-01',
  fecha_fin: null,
  estado: 'en_progreso',
  destacado: true,
  orden: 0,
  tecnologias: [],
  imagenes: [],
}

const CERTIFICACION: CertificacionPublica = {
  id: 'cert-1',
  usuario_admin_id: 'admin-1',
  nombre: 'AWS Certified',
  institucion: 'AWS',
  fecha_emision: '2025-01-01',
  fecha_expiracion: null,
  url_verificacion: 'https://aws.amazon.com/verify',
  credencial_id: null,
  logo_media_id: null,
  orden: 0,
  logo: null,
}

function renderConModo(modo: 'publico' | 'editor', children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={modo}>{children}</ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueProyectos en modo editor', () => {
  it('no renderiza un <a> navegable (usa EnlaceBloque neutralizado)', () => {
    renderConModo(
      'editor',
      <BloqueProyectos
        titulo="Proyectos"
        config={{ cantidad_a_mostrar: 3, solo_destacados: false }}
        proyectos={[PROYECTO]}
      />,
    )

    // `EnlaceBloque` en modo `'editor'` sigue exponiendo `role="link"` (así
    // el lienzo se sigue viendo/leyendo como una tarjeta clicable), pero
    // sobre un `<div>` sin `href` y con `aria-disabled="true"` — nunca un
    // `<a>` real que pudiera navegar fuera del iframe del editor.
    const tarjeta = screen.getByRole('link', { name: /portafolio/i })
    expect(tarjeta.tagName).toBe('DIV')
    expect(tarjeta).toHaveAttribute('aria-disabled', 'true')
    expect(tarjeta).not.toHaveAttribute('href')
  })

  it('en modo público sí renderiza un <a> navegable al detalle del proyecto', () => {
    renderConModo(
      'publico',
      <BloqueProyectos
        titulo="Proyectos"
        config={{ cantidad_a_mostrar: 3, solo_destacados: false }}
        proyectos={[PROYECTO]}
      />,
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/proyecto/proyecto-1',
    )
  })
})

describe('BloqueCertificaciones en modo editor', () => {
  it('no renderiza un <a> navegable (usa EnlaceBloque neutralizado)', () => {
    renderConModo(
      'editor',
      <BloqueCertificaciones
        titulo="Certificaciones"
        config={{ orden: 'fecha' }}
        certificaciones={[CERTIFICACION]}
      />,
    )

    const tarjeta = screen.getByRole('link', { name: /aws certified/i })
    expect(tarjeta.tagName).toBe('DIV')
    expect(tarjeta).toHaveAttribute('aria-disabled', 'true')
    expect(tarjeta).not.toHaveAttribute('href')
  })

  it('en modo público sí renderiza un <a> navegable al detalle de la certificación', () => {
    renderConModo(
      'publico',
      <BloqueCertificaciones
        titulo="Certificaciones"
        config={{ orden: 'fecha' }}
        certificaciones={[CERTIFICACION]}
      />,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/certificacion/cert-1')
  })
})
