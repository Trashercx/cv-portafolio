import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { Proyecto } from '@/features/proyectos/types'
import { BloqueProyectos } from './BloqueProyectos'

/**
 * Fase 7 (7.3, UC-12): `disposicion` (tarjetas/bento/lista), `estilo_tarjeta`
 * vidrio, `mostrar_tecnologias` y `efecto_hover` de `proyectos`.
 */

function proyecto(n: number, extra: Partial<Proyecto> = {}): Proyecto {
  return {
    id: `p${n}`,
    usuario_admin_id: 'admin-1',
    titulo: `Proyecto ${n}`,
    descripcion: `Descripción ${n}`,
    url_demo: null,
    url_repositorio: null,
    fecha_inicio: '2025-01-01',
    fecha_fin: null,
    estado: 'en_progreso',
    destacado: false,
    orden: n,
    tecnologias: [],
    imagenes: [],
    ...extra,
  }
}

const TECNOLOGIAS = ['React', 'Nest', 'Prisma'].map((nombre, i) => ({
  proyecto_id: 'p1',
  tecnologia_id: `t${i}`,
  tecnologia: { id: `t${i}`, nombre },
}))

function renderProyectos(
  config: Partial<Parameters<typeof BloqueProyectos>[0]['config']>,
  proyectos: Proyecto[],
) {
  return render(
    <ProveedorDetallePublico>
      <BloqueProyectos
        titulo="Proyectos"
        config={{ cantidad_a_mostrar: 10, solo_destacados: false, ...config }}
        proyectos={proyectos}
      />
    </ProveedorDetallePublico>,
  )
}

describe('BloqueProyectos — disposición (Fase 7)', () => {
  it('tarjetas (default) usa la cuadrícula por columnas', () => {
    const { container } = renderProyectos({ columnas: 3 }, [proyecto(1), proyecto(2)])
    const grid = container.querySelector('[data-disposicion="tarjetas"]')
    expect(grid).toHaveClass('grid', 'sm:grid-cols-2', 'lg:grid-cols-3')
  })

  it('bento usa 6 columnas en md; el primero ocupa 4 columnas y 2 filas y el resto 2 columnas', () => {
    const { container } = renderProyectos({ disposicion: 'bento' }, [
      proyecto(1),
      proyecto(2),
      proyecto(3),
    ])
    const grid = container.querySelector('[data-disposicion="bento"]') as HTMLElement
    expect(grid).toHaveClass('md:grid-cols-6')
    const celdas = Array.from(grid.children)
    expect(celdas[0]).toHaveClass('md:col-span-4', 'md:row-span-2')
    expect(celdas[1]).toHaveClass('md:col-span-2')
    expect(celdas[2]).toHaveClass('md:col-span-2')
    expect(celdas[1]).not.toHaveClass('md:row-span-2')
  })

  it('bento lleva al frente el primer proyecto destacado', () => {
    const { container } = renderProyectos({ disposicion: 'bento' }, [
      proyecto(1),
      proyecto(2, { destacado: true }),
      proyecto(3),
    ])
    const primera = container.querySelector('[data-disposicion="bento"]')?.firstElementChild
    expect(primera).toHaveTextContent('Proyecto 2')
    expect(primera).toHaveClass('md:col-span-4')
  })

  it('lista apila filas con imagen pequeña y texto', () => {
    const { container } = renderProyectos(
      { disposicion: 'lista' },
      [
        proyecto(1, {
          imagenes: [
            {
              proyecto_id: 'p1',
              media_id: 'm1',
              orden: 0,
              media: {
                id: 'm1',
                url: 'https://cdn.example.com/p1.jpg',
                s3_key: 'k',
                tipo: 'imagen',
                ancho: null,
                alto: null,
                alt_text: 'Captura',
                created_at: '2026-01-01T00:00:00.000Z',
              },
            },
          ],
        }),
      ],
    )
    expect(container.querySelector('[data-disposicion="lista"]')).toHaveClass('grid', 'gap-3')
    expect(screen.getByRole('button', { name: 'Proyecto 1' })).toHaveClass('flex', 'items-start')
    expect(screen.getByAltText('Captura')).toHaveClass('w-24', 'shrink-0')
  })
})

describe('BloqueProyectos — tarjeta y tecnologías (Fase 7)', () => {
  it('estilo_tarjeta="vidrio" aplica la tarjeta translúcida', () => {
    renderProyectos({ estilo_tarjeta: 'vidrio' }, [proyecto(1)])
    expect(screen.getByRole('button', { name: 'Proyecto 1' })).toHaveClass(
      'bg-card/60',
      'backdrop-blur-sm',
      'border-border/50',
    )
  })

  it('mostrar_tecnologias (default true) pinta chips con los nombres', () => {
    renderProyectos({}, [proyecto(1, { tecnologias: TECNOLOGIAS })])
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Nest')).toBeInTheDocument()
    expect(screen.getByText('Prisma')).toBeInTheDocument()
  })

  it('mostrar_tecnologias=false oculta los chips', () => {
    renderProyectos({ mostrar_tecnologias: false }, [proyecto(1, { tecnologias: TECNOLOGIAS })])
    expect(screen.queryByText('React')).not.toBeInTheDocument()
  })

  it('con más de 5 tecnologías resume el resto en +N', () => {
    const muchas = Array.from({ length: 7 }, (_, i) => ({
      proyecto_id: 'p1',
      tecnologia_id: `t${i}`,
      tecnologia: { id: `t${i}`, nombre: `Tec${i}` },
    }))
    renderProyectos({}, [proyecto(1, { tecnologias: muchas })])
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.queryByText('Tec6')).not.toBeInTheDocument()
  })
})

describe('BloqueProyectos — efecto hover (Fase 7)', () => {
  it('elevar (default) aplica hover:-translate-y-1 y hover:shadow-xl al contenedor', () => {
    const { container } = renderProyectos({}, [proyecto(1)])
    const contenedor = container.querySelector('[data-efecto-hover]')
    expect(contenedor).toHaveAttribute('data-efecto-hover', 'elevar')
    expect(contenedor).toHaveClass('hover:-translate-y-1', 'hover:shadow-xl')
  })

  it('ninguno no aplica efecto', () => {
    const { container } = renderProyectos({ efecto_hover: 'ninguno' }, [proyecto(1)])
    expect(container.querySelector('[data-efecto-hover="ninguno"]')).not.toHaveClass(
      'hover:-translate-y-1',
    )
  })

  it('inclinar monta el contenedor con tilt 3D', () => {
    const { container } = renderProyectos({ efecto_hover: 'inclinar' }, [proyecto(1)])
    expect(container.querySelector('[data-efecto-hover="inclinar"]')).toBeInTheDocument()
  })
})
