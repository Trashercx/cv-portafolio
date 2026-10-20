import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import type { Proyecto } from '@/features/proyectos/types'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueProyectos } from './BloqueProyectos'

/**
 * Fase 7l (UC-02, UC-36): tarjeta de proyecto rediseñada (portada con
 * degradado, chip de estado, acciones Demo/Código, lenguaje y estrellas de
 * GitHub, fechas) y disposición `vitrina`. La clave ausente conserva el aspecto
 * previo (estado, enlaces y GitHub visibles; fechas ocultas).
 */

function proyecto(n: number, extra: Partial<Proyecto> = {}): Proyecto {
  return {
    id: `p${n}`,
    usuario_admin_id: 'admin-1',
    titulo: `Proyecto ${n}`,
    descripcion: `Descripción ${n}`,
    url_demo: null,
    url_repositorio: null,
    fecha_inicio: '2024-03-01',
    fecha_fin: null,
    estado: 'en_progreso',
    destacado: false,
    orden: n,
    tecnologias: [],
    imagenes: [],
    ...extra,
  }
}

const IMAGEN = {
  proyecto_id: 'p1',
  media_id: 'm1',
  orden: 0,
  media: {
    id: 'm1',
    url: 'https://cdn.example.com/p1.jpg',
    s3_key: 'k',
    tipo: 'imagen' as const,
    ancho: 1600,
    alto: 900,
    alt_text: 'Captura',
    created_at: '2026-01-01T00:00:00.000Z',
    variantes: [{ formato: 'webp' as const, ancho: 640, alto: 360, url: 'https://cdn.example.com/p1-640.webp' }],
  },
}

function renderProyectos(
  config: Partial<Parameters<typeof BloqueProyectos>[0]['config']>,
  proyectos: Proyecto[],
  modo: 'publico' | 'editor' = 'publico',
) {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={modo}>
        <ProveedorDetallePublico>
          <BloqueProyectos
            titulo="Proyectos"
            config={{ cantidad_a_mostrar: 10, solo_destacados: false, ...config }}
            proyectos={proyectos}
          />
        </ProveedorDetallePublico>
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueProyectos — estado (Fase 7l, UC-02)', () => {
  it('pinta un chip por estado conocido', () => {
    renderProyectos({}, [
      proyecto(1, { estado: 'en_progreso' }),
      proyecto(2, { estado: 'finalizado' }),
      proyecto(3, { estado: 'pausado' }),
    ])
    expect(screen.getByText('En curso')).toHaveAttribute('data-chip', 'primario')
    expect(screen.getByText('Finalizado')).toHaveAttribute('data-chip', 'exito')
    expect(screen.getByText('Pausado')).toHaveAttribute('data-chip', 'aviso')
  })

  it('un estado desconocido no pinta chip y mostrar_estado=false los oculta todos', () => {
    renderProyectos({}, [proyecto(1, { estado: 'archivado' })])
    expect(document.querySelector('[data-chip]')).toBeNull()

    renderProyectos({ mostrar_estado: false }, [proyecto(2)])
    expect(screen.queryByText('En curso')).not.toBeInTheDocument()
  })

  it('en la lista el chip va junto a las tecnologías y no sobre la portada', () => {
    renderProyectos({ disposicion: 'lista' }, [proyecto(1)])
    const chip = screen.getByText('En curso')
    expect(chip.closest('[data-medio]')?.querySelector('[data-degradado]')?.parentElement).not.toContainElement(chip)
  })
})

describe('BloqueProyectos — portada (Fase 7l, UC-02)', () => {
  it('con imagen usa ImagenResponsive (picture con variantes) y degradado inferior', () => {
    const { container } = renderProyectos({}, [proyecto(1, { imagenes: [IMAGEN] })])
    expect(container.querySelector('picture source[type="image/webp"]')).toBeInTheDocument()
    const img = screen.getByAltText('Captura')
    expect(img).toHaveClass('absolute', 'inset-0', 'object-cover')
    expect(img.closest('[data-medio]')).toHaveAttribute('data-medio', 'arriba')
    expect(container.querySelector('[data-degradado]')).toBeInTheDocument()
    expect(img.parentElement?.className ?? '').not.toMatch(/#|rgb/)
  })

  it('sin imagen muestra un fondo con los colores del tema', () => {
    const { container } = renderProyectos({}, [proyecto(1)])
    expect(container.querySelector('[data-portada="vacia"]')).toHaveClass('from-[var(--color-primario)]/20')
  })
})

describe('BloqueProyectos — acciones y enlaces seguros (Fase 7l, UC-02)', () => {
  it('Demo y Código son enlaces externos; GitHub usa su logo y otro host el de enlace externo', () => {
    renderProyectos({}, [
      proyecto(1, { url_demo: 'https://demo.example.com', url_repositorio: 'https://github.com/ada/app' }),
      proyecto(2, { url_repositorio: 'https://gitlab.com/ada/app' }),
    ])
    const demo = screen.getByRole('link', { name: 'Demo de Proyecto 1' })
    expect(demo).toHaveAttribute('href', 'https://demo.example.com')
    expect(demo).toHaveAttribute('target', '_blank')
    const codigoGithub = screen.getByRole('link', { name: 'Código de Proyecto 1' })
    expect(codigoGithub.querySelector('[data-icono="github"]')).toBeInTheDocument()
    const codigoOtro = screen.getByRole('link', { name: 'Código de Proyecto 2' })
    expect(codigoOtro.querySelector('[data-icono="github"]')).not.toBeInTheDocument()
    expect(codigoOtro.querySelector('.lucide-external-link')).toBeInTheDocument()
  })

  it('origen github usa el logo aunque la URL sea de otro host', () => {
    renderProyectos({}, [
      proyecto(1, { origen: 'github', url_repositorio: 'https://git.example.com/ada/app' }),
    ])
    expect(
      screen.getByRole('link', { name: 'Código de Proyecto 1' }).querySelector('[data-icono="github"]'),
    ).toBeInTheDocument()
  })

  it('descarta esquemas peligrosos y rutas internas', () => {
    renderProyectos({}, [
      proyecto(1, { url_demo: 'javascript:alert(1)', url_repositorio: 'data:text/html,hola' }),
    ])
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(document.querySelector('article .pointer-events-auto')).toBeNull()
  })

  it('mostrar_enlaces=false oculta las acciones', () => {
    renderProyectos({ mostrar_enlaces: false }, [proyecto(1, { url_demo: 'https://demo.example.com' })])
    expect(screen.queryByRole('link', { name: /Demo/ })).not.toBeInTheDocument()
  })

  it('en el lienzo los enlaces no navegan (div role=link inerte)', () => {
    renderProyectos({}, [proyecto(1, { url_demo: 'https://demo.example.com' })], 'editor')
    const demo = screen.getByRole('link', { name: 'Demo de Proyecto 1' })
    expect(demo.tagName).toBe('DIV')
    expect(demo).toHaveAttribute('aria-disabled', 'true')
    expect(demo).not.toHaveAttribute('href')
  })

  it('el clic de la tarjeta sigue siendo un solo botón con el título como nombre (los enlaces no van dentro)', () => {
    renderProyectos({}, [proyecto(1, { url_demo: 'https://demo.example.com' })])
    const boton = screen.getByRole('button', { name: 'Proyecto 1' })
    expect(boton).toBeEmptyDOMElement()
    expect(within(boton).queryByRole('link')).toBeNull()
  })
})

describe('BloqueProyectos — GitHub y fechas (Fase 7l, UC-02, UC-36)', () => {
  const github = proyecto(1, {
    origen: 'github',
    github_lenguaje: 'TypeScript',
    github_estrellas: 42,
    estado: 'finalizado',
    fecha_inicio: '2023-05-01',
    fecha_fin: '2025-02-01',
  })

  it('muestra lenguaje y estrellas por defecto y se pueden ocultar', () => {
    const { unmount } = renderProyectos({}, [github])
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByLabelText('42 estrellas en GitHub')).toBeInTheDocument()
    unmount()

    renderProyectos({ mostrar_github: false }, [github])
    expect(screen.queryByText('TypeScript')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/estrellas/)).not.toBeInTheDocument()
  })

  it('un proyecto sin datos de GitHub (snapshots anteriores) no pinta línea meta', () => {
    renderProyectos({}, [proyecto(1)])
    expect(document.querySelector('[data-meta-proyecto]')).toBeNull()
  })

  it('las fechas están ocultas por defecto y se muestran como rango de años', () => {
    const { unmount } = renderProyectos({}, [github])
    expect(screen.queryByText(/2023/)).not.toBeInTheDocument()
    unmount()

    const { unmount: otro } = renderProyectos({ mostrar_fechas: true }, [github])
    expect(screen.getByText('2023 – 2025')).toBeInTheDocument()
    otro()

    renderProyectos({ mostrar_fechas: true }, [proyecto(2)])
    expect(screen.getByText('2024 – Actual')).toBeInTheDocument()
  })
})

describe('BloqueProyectos — vitrina (Fase 7l, UC-02)', () => {
  it('apila filas grandes cuya imagen alterna de lado', () => {
    const { container } = renderProyectos({ disposicion: 'vitrina' }, [
      proyecto(1, { imagenes: [IMAGEN] }),
      proyecto(2),
      proyecto(3),
    ])
    const contenedor = container.querySelector('[data-disposicion="vitrina"]') as HTMLElement
    expect(contenedor).toHaveClass('grid', 'gap-6')
    const tarjetas = Array.from(contenedor.querySelectorAll('article'))
    expect(tarjetas.map((t) => t.getAttribute('data-medio'))).toEqual([
      'fila_md',
      'fila_md_inversa',
      'fila_md',
    ])
    expect(tarjetas[0]).toHaveClass('flex-col', 'md:flex-row')
    expect(tarjetas[1]).toHaveClass('md:flex-row-reverse')
    expect(screen.getByAltText('Captura').closest('picture')?.parentElement).toHaveClass('md:w-3/5')
  })

  it('respeta solo_destacados y cantidad_a_mostrar', () => {
    renderProyectos({ disposicion: 'vitrina', solo_destacados: true, cantidad_a_mostrar: 1 }, [
      proyecto(1),
      proyecto(2, { destacado: true }),
      proyecto(3, { destacado: true }),
    ])
    expect(screen.queryByRole('button', { name: 'Proyecto 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Proyecto 2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Proyecto 3' })).not.toBeInTheDocument()
  })

  it('conserva mostrar_descripcion y mostrar_tecnologias', () => {
    renderProyectos({ disposicion: 'vitrina', mostrar_descripcion: false, mostrar_tecnologias: false }, [
      proyecto(1, {
        tecnologias: [{ proyecto_id: 'p1', tecnologia_id: 't1', tecnologia: { id: 't1', nombre: 'React' } }],
      }),
    ])
    expect(screen.queryByText('Descripción 1')).not.toBeInTheDocument()
    expect(screen.queryByText('React')).not.toBeInTheDocument()
  })
})
