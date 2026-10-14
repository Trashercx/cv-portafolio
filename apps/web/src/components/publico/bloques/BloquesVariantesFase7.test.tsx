import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { Logro } from '@/features/logros/types'
import type { CertificacionPublica } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type { Skill } from '@/features/skills/types'
import { BloqueCertificaciones } from './BloqueCertificaciones'
import { BloqueContacto } from './BloqueContacto'
import { BloqueGaleria } from './BloqueGaleria'
import { BloqueLogros } from './BloqueLogros'
import { BloqueSkills } from './BloqueSkills'
import { CLASES_BORDE_BLOQUE } from '@/lib/escalas-bloque'

/**
 * Fase 7 (7.3, UC-12): variantes nuevas de skills (cuadrícula/nube y chips),
 * contacto (tarjeta destacada), galería (`efecto_hover`) y `efecto_hover` de
 * certificaciones y logros. Un test de render por variante, contra las
 * tablas literales de clases.
 */

const SKILLS: Skill[] = ['React', 'Nest', 'Prisma', 'Docker'].map((nombre, i) => ({
  id: `skill-${i}`,
  usuario_admin_id: 'admin-1',
  nombre,
  icono: nombre.toLowerCase(),
  orden: i,
  visible: true,
}))

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

describe('BloqueSkills — disposición y chips (Fase 7)', () => {
  const config = { direccion: 'izquierda', velocidad: 'media' } as const

  it('marquesina (default) conserva el carrusel y no pinta la lista', () => {
    const { container } = render(<BloqueSkills titulo="Skills" config={config} skills={SKILLS} />)
    expect(container.querySelector('.carrusel-skills')).toBeInTheDocument()
    expect(container.querySelector('[data-disposicion]')).not.toBeInTheDocument()
  })

  it('cuadricula usa un grid responsive de chips con nombre', () => {
    const { container } = render(
      <BloqueSkills
        titulo="Skills"
        config={{ ...config, disposicion: 'cuadricula' }}
        skills={SKILLS}
      />,
    )
    const lista = container.querySelector('[data-disposicion="cuadricula"]')
    expect(lista).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-6')
    expect(container.querySelector('.carrusel-skills')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[data-chip-skill]')).toHaveLength(4)
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('nube usa flex-wrap centrado con chips de tamaños variados', () => {
    const { container } = render(
      <BloqueSkills titulo="Skills" config={{ ...config, disposicion: 'nube' }} skills={SKILLS} />,
    )
    const lista = container.querySelector('[data-disposicion="nube"]')
    expect(lista).toHaveClass('flex', 'flex-wrap', 'justify-center')
    const chips = Array.from(container.querySelectorAll('[data-chip-skill]'))
    expect(chips[0]).toHaveClass('px-3', 'text-sm')
    expect(chips[1]).toHaveClass('px-4', 'text-base')
    expect(chips[2]).toHaveClass('px-5', 'text-lg')
    expect(chips[3]).toHaveClass('px-3')
  })

  it.each([
    ['simple', 'bg-muted'],
    ['vidrio', 'backdrop-blur-sm'],
    ['contorno', CLASES_BORDE_BLOQUE],
  ] as const)('estilo_chip="%s" aplica %s', (estilo, clase) => {
    const { container } = render(
      <BloqueSkills
        titulo="Skills"
        config={{ ...config, disposicion: 'cuadricula', estilo_chip: estilo }}
        skills={SKILLS}
      />,
    )
    expect(container.querySelector(`[data-chip-skill="${estilo}"]`)).toHaveClass(clase)
  })

  it('mostrar_nombres=false oculta el nombre en la cuadrícula pero la nube siempre lo muestra', () => {
    const { rerender } = render(
      <BloqueSkills
        titulo="Skills"
        config={{ ...config, disposicion: 'cuadricula', mostrar_nombres: false }}
        skills={SKILLS}
      />,
    )
    expect(screen.queryByText('React')).not.toBeInTheDocument()
    rerender(
      <BloqueSkills
        titulo="Skills"
        config={{ ...config, disposicion: 'nube', mostrar_nombres: false }}
        skills={SKILLS}
      />,
    )
    expect(screen.getByText('React')).toBeInTheDocument()
  })
})

describe('BloqueContacto — tarjeta destacada (Fase 7)', () => {
  it('estilo="simple" (default) no usa la tarjeta destacada', () => {
    const { container } = render(
      <BloqueContacto
        titulo="Contacto"
        config={{ mostrar_formulario: false, texto_llamada: 'Hablemos' }}
        perfil={null}
        redesSociales={REDES}
      />,
    )
    expect(container.querySelector('[data-estilo-contacto]')).not.toBeInTheDocument()
    expect(screen.queryByText('Hablemos')).not.toBeInTheDocument()
  })

  it('tarjeta_destacada pinta la tarjeta con degradado, la llamada como titular y botones de redes', () => {
    const { container } = render(
      <BloqueContacto
        titulo="Contacto"
        config={{
          mostrar_formulario: false,
          estilo: 'tarjeta_destacada',
          texto_llamada: 'Trabajemos juntos',
        }}
        perfil={null}
        redesSociales={REDES}
      />,
    )
    const tarjeta = container.querySelector('[data-estilo-contacto="tarjeta_destacada"]')
    expect(tarjeta).toHaveClass(
      'rounded-3xl',
      'bg-linear-to-br',
      'from-[var(--color-primario)]/15',
      'to-[var(--color-secundario)]/15',
    )
    expect(screen.getByText('Trabajemos juntos')).toHaveClass('text-3xl', 'font-bold')
    // `estilo_redes` no aplica: la tarjeta fuerza los botones de color primario.
    expect(screen.getByRole('link', { name: /github/i }).style.backgroundColor).toBe(
      'var(--color-primario)',
    )
  })

  it('tarjeta_destacada sin texto_llamada usa el título como titular', () => {
    render(
      <BloqueContacto
        titulo="Contáctame"
        config={{ mostrar_formulario: false, estilo: 'tarjeta_destacada' }}
        perfil={null}
        redesSociales={[]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Contáctame' })).toHaveClass('text-3xl')
  })
})

describe('BloqueGaleria — efecto_hover (Fase 7)', () => {
  const fotos = [
    {
      media_id: 'm1',
      media: {
        id: 'm1',
        url: 'https://cdn.example.com/1.jpg',
        s3_key: 'k',
        tipo: 'imagen' as const,
        ancho: null,
        alto: null,
        alt_text: 'Foto uno',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    },
  ]

  it('zoom (default) escala la imagen al pasar el cursor', () => {
    render(<BloqueGaleria titulo="Galería" config={{ fotos, disposicion: 'grid' }} />)
    expect(screen.getByAltText('Foto uno')).toHaveClass('hover:scale-105')
  })

  it('elevar eleva la tarjeta y no escala la imagen', () => {
    render(
      <BloqueGaleria titulo="Galería" config={{ fotos, disposicion: 'grid', efecto_hover: 'elevar' }} />,
    )
    expect(screen.getByAltText('Foto uno')).not.toHaveClass('hover:scale-105')
    expect(screen.getByRole('button', { name: 'Ver foto' })).toHaveClass(
      'hover:-translate-y-1',
      'hover:shadow-xl',
    )
  })

  it('ninguno no aplica efecto', () => {
    render(
      <BloqueGaleria titulo="Galería" config={{ fotos, disposicion: 'grid', efecto_hover: 'ninguno' }} />,
    )
    expect(screen.getByAltText('Foto uno')).not.toHaveClass('hover:scale-105')
    expect(screen.getByRole('button', { name: 'Ver foto' })).not.toHaveClass('hover:-translate-y-1')
  })
})

describe('efecto_hover en certificaciones y logros (Fase 7)', () => {
  const certificacion = {
    id: 'c1',
    usuario_admin_id: 'admin-1',
    nombre: 'AWS Cloud Practitioner',
    institucion: 'AWS',
    fecha_emision: '2025-01-01',
    url_verificacion: null,
    logo_media_id: null,
    orden: 0,
    logo: null,
  } as unknown as CertificacionPublica

  const logro = {
    id: 'l1',
    usuario_admin_id: 'admin-1',
    titulo: 'Premio',
    descripcion: 'Descripción',
    fecha: '2025-01-01',
    categoria: 'general',
    url_referencia: null,
    orden: 0,
  } as unknown as Logro

  it('certificaciones: elevar por defecto, inclinar e ninguno por configuración', () => {
    const { container, rerender } = render(
      <ProveedorDetallePublico>
        <BloqueCertificaciones
          titulo="Certificaciones"
          config={{ orden: 'manual' }}
          certificaciones={[certificacion]}
        />
      </ProveedorDetallePublico>,
    )
    expect(container.querySelector('[data-efecto-hover="elevar"]')).toBeInTheDocument()

    rerender(
      <ProveedorDetallePublico>
        <BloqueCertificaciones
          titulo="Certificaciones"
          config={{ orden: 'manual', efecto_hover: 'inclinar' }}
          certificaciones={[certificacion]}
        />
      </ProveedorDetallePublico>,
    )
    expect(container.querySelector('[data-efecto-hover="inclinar"]')).toBeInTheDocument()

    rerender(
      <ProveedorDetallePublico>
        <BloqueCertificaciones
          titulo="Certificaciones"
          config={{ orden: 'manual', efecto_hover: 'ninguno' }}
          certificaciones={[certificacion]}
        />
      </ProveedorDetallePublico>,
    )
    expect(container.querySelector('[data-efecto-hover="ninguno"]')).toBeInTheDocument()
  })

  it('logros en tarjetas aplica el efecto; la línea de tiempo no', () => {
    const { container, rerender } = render(
      <ProveedorDetallePublico>
        <BloqueLogros titulo="Logros" config={{ efecto_hover: 'elevar' }} logros={[logro]} />
      </ProveedorDetallePublico>,
    )
    expect(container.querySelector('[data-efecto-hover="elevar"]')).toHaveClass('hover:shadow-xl')

    rerender(
      <ProveedorDetallePublico>
        <BloqueLogros
          titulo="Logros"
          config={{ estilo_lista: 'linea_tiempo', efecto_hover: 'elevar' }}
          logros={[logro]}
        />
      </ProveedorDetallePublico>,
    )
    expect(container.querySelector('[data-efecto-hover]')).not.toBeInTheDocument()
  })
})
