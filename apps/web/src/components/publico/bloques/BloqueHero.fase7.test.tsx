import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type { HeroConfiguracion } from '@/features/secciones/types'
import { simularMovimientoReducido } from '@/test/movimiento'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueHero } from './BloqueHero'

/**
 * Fase 7 (7.3, UC-12): disposiciones, títulos rotativos, segundo botón,
 * redes, indicador de scroll, efecto de título y decoración del hero. Los
 * tests del fallback de la foto en Puck viven en `BloqueHero.test.tsx`.
 */

const PERFIL: PerfilPublico = {
  id: 'perfil-1',
  usuario_admin_id: 'admin-1',
  nombre_completo: 'Ada Lovelace',
  titulo_profesional: 'Ingeniera',
  resumen_bio: 'Bio',
  imagen_perfil_id: 'media-1',
  cv_media_id: null,
  ubicacion: 'Remoto',
  updated_at: '2026-01-01T00:00:00.000Z',
  imagen_perfil: {
    id: 'media-1',
    url: 'https://cdn.example.com/foto.jpg',
    s3_key: 'perfil/foto.jpg',
    tipo: 'imagen',
    ancho: null,
    alto: null,
    alt_text: 'Foto de Ada',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  cv_media: null,
}

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

const BASE: HeroConfiguracion = { titulo: 'Hola mundo', subtitulo: 'Subtítulo' }

function renderHero(
  config: Partial<HeroConfiguracion>,
  extra: { modo?: 'publico' | 'editor'; redes?: RedSocial[]; hrefSiguiente?: string } = {},
) {
  return render(
    <MemoryRouter>
      <ProveedorModoRenderizado modo={extra.modo ?? 'publico'}>
        <BloqueHero
          config={{ ...BASE, ...config }}
          perfil={PERFIL}
          redesSociales={extra.redes}
          hrefSiguiente={extra.hrefSiguiente}
        />
      </ProveedorModoRenderizado>
    </MemoryRouter>,
  )
}

describe('BloqueHero — disposición (Fase 7)', () => {
  it('centrado (default) mantiene el layout centrado de siempre', () => {
    const { container } = renderHero({})
    expect(container.firstElementChild).toHaveClass('text-center', 'grid', 'p-8')
    expect(container.firstElementChild).not.toHaveClass('md:grid-cols-2')
  })

  it('dividido pone texto y foto en 2 columnas desde md, alineado a la izquierda', () => {
    const { container } = renderHero({
      disposicion: 'dividido',
      mostrar_foto_perfil: true,
      posicion_foto: 'centrada',
      estilo_foto: 'con_marco',
    })
    expect(container.firstElementChild).toHaveClass('md:grid-cols-2', 'md:items-center', 'text-left')
    // la foto va en la columna derecha, grande
    expect(screen.getByAltText('Foto de Ada')).toHaveClass('md:size-72')
  })

  it('dividido sin foto muestra un visual decorativo en la columna derecha', () => {
    const { container } = renderHero({
      disposicion: 'dividido',
      mostrar_foto_perfil: false,
    })
    expect(container.querySelector('[data-visual-decorativo="true"]')).toBeInTheDocument()
  })

  it('editorial usa el título enorme text-6xl md:text-8xl y subtítulo en columna estrecha', () => {
    renderHero({ disposicion: 'editorial', tamano_titulo: 'normal' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-6xl', 'md:text-8xl')
    expect(screen.getByText('Subtítulo')).toHaveClass('max-w-md', 'text-left')
  })
})

describe('BloqueHero — efecto del título (Fase 7)', () => {
  it('degradado aplica bg-clip-text con primario → secundario', () => {
    renderHero({ efecto_titulo: 'degradado' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass(
      'bg-clip-text',
      'text-transparent',
      'from-[var(--color-primario)]',
      'to-[var(--color-secundario)]',
    )
  })

  it('resaltado marca solo la última palabra', () => {
    const { container } = renderHero({ efecto_titulo: 'resaltado' })
    const marcador = container.querySelector('[data-resaltado="true"]')
    expect(marcador).toHaveTextContent('mundo')
    expect(marcador).toHaveClass('bg-[var(--color-primario)]/30')
  })

  it('ninguno no aplica clases de efecto', () => {
    const { container } = renderHero({ efecto_titulo: 'ninguno' })
    expect(container.querySelector('[data-resaltado]')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('bg-clip-text')
  })
})

describe('BloqueHero — botones, redes e indicador (Fase 7)', () => {
  it('muestra el segundo botón (outline) solo con texto y enlace', () => {
    renderHero({
      texto_boton: 'Ver proyectos',
      enlace_boton: 'https://example.com',
      texto_boton_secundario: 'Contáctame',
      enlace_boton_secundario: '#contacto',
    })
    const secundario = screen.getByRole('link', { name: 'Contáctame' })
    expect(secundario).toHaveClass('border-2', 'bg-transparent')
    expect(secundario).toHaveAttribute('href', '#contacto')
    expect(screen.getByRole('link', { name: 'Ver proyectos' })).toBeInTheDocument()
  })

  it('sin enlace el segundo botón no aparece', () => {
    renderHero({ texto_boton_secundario: 'Contáctame' })
    expect(screen.queryByRole('link', { name: 'Contáctame' })).not.toBeInTheDocument()
  })

  it('mostrar_redes pinta las redes en modo iconos', () => {
    renderHero({ mostrar_redes: true }, { redes: REDES })
    const enlace = screen.getByRole('link', { name: 'GitHub' })
    expect(enlace).toHaveClass('rounded-full')
  })

  it('mostrar_redes=false (default) no pinta redes', () => {
    renderHero({}, { redes: REDES })
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
  })

  it('mostrar_indicador_scroll enlaza a la sección siguiente', () => {
    renderHero({ mostrar_indicador_scroll: true }, { hrefSiguiente: '#seccion-xyz' })
    expect(screen.getByRole('link', { name: 'Ir a la siguiente sección' })).toHaveAttribute(
      'href',
      '#seccion-xyz',
    )
  })

  it('el indicador sin destino es solo decorativo', () => {
    const { container } = renderHero({ mostrar_indicador_scroll: true })
    expect(container.querySelector('[data-indicador-scroll="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a la siguiente sección' })).not.toBeInTheDocument()
  })
})

describe('BloqueHero — decoración de fondo (Fase 7)', () => {
  it.each(['manchas', 'cuadricula', 'puntos'] as const)('%s dibuja la decoración', (tipo) => {
    const { container } = renderHero({ decoracion_fondo: tipo })
    expect(container.querySelector(`[data-decoracion="${tipo}"]`)).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('overflow-hidden')
  })

  it('manchas usa blobs difuminados animados', () => {
    const { container } = renderHero({ decoracion_fondo: 'manchas' })
    const blobs = container.querySelectorAll('.hero-blob')
    expect(blobs.length).toBeGreaterThanOrEqual(2)
    expect(blobs.length).toBeLessThanOrEqual(3)
    expect(blobs[0]).toHaveClass('blur-3xl')
  })

  it('"ninguna" no dibuja nada y no recorta', () => {
    const { container } = renderHero({ decoracion_fondo: 'ninguna' })
    expect(container.querySelector('[data-decoracion]')).not.toBeInTheDocument()
    expect(container.firstElementChild).not.toHaveClass('overflow-hidden')
  })

  it('es compatible con imagen_fondo y overlay_fondo', () => {
    const { container } = renderHero({
      decoracion_fondo: 'puntos',
      overlay_fondo: 'oscuro',
      imagen_fondo: {
        id: 'm',
        url: 'https://cdn.example.com/fondo.jpg',
        s3_key: 'k',
        tipo: 'imagen',
        ancho: null,
        alto: null,
        alt_text: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    })
    expect(container.querySelector('.bg-black\\/40')).toBeInTheDocument()
    expect(container.querySelector('[data-decoracion="puntos"]')).toBeInTheDocument()
    expect((container.firstElementChild as HTMLElement).style.backgroundImage).toContain('fondo.jpg')
  })
})

describe('BloqueHero — títulos rotativos (Fase 7)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('en el lienzo del editor muestra el primero fijo y expone la lista para lectores', () => {
    simularMovimientoReducido(false)
    const { container } = renderHero(
      { titulos_rotativos: ['Desarrolladora', 'Diseñadora'] },
      { modo: 'editor' },
    )
    const parrafo = container.querySelector('[data-titulos-rotativos="true"]') as HTMLElement
    expect(parrafo.querySelector('[aria-hidden="true"]')).toHaveTextContent('Desarrolladora')
    expect(parrafo.querySelector('.sr-only')).toHaveTextContent('Desarrolladora, Diseñadora')
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(parrafo.querySelector('[aria-hidden="true"]')).toHaveTextContent('Desarrolladora')
  })

  it('con prefers-reduced-motion muestra el primero fijo', () => {
    simularMovimientoReducido(true)
    const { container } = renderHero({ titulos_rotativos: ['Uno', 'Dos'] })
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(container.querySelector('[data-titulos-rotativos="true"] [aria-hidden="true"]')).toHaveTextContent(
      'Uno',
    )
  })

  it('en el sitio público rota cada 2,8 s', () => {
    simularMovimientoReducido(false)
    const { container } = renderHero({ titulos_rotativos: ['Uno', 'Dos'] })
    const visible = () =>
      container.querySelector('[data-titulos-rotativos="true"] [aria-hidden="true"]')?.textContent
    expect(visible()).toBe('Uno')
    act(() => {
      vi.advanceTimersByTime(2800)
    })
    expect(visible()).toBe('Dos')
  })

  it('sin títulos rotativos no pinta el párrafo', () => {
    const { container } = renderHero({ titulos_rotativos: [] })
    expect(container.querySelector('[data-titulos-rotativos]')).not.toBeInTheDocument()
  })
})
