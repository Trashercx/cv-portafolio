import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GaleriaConfiguracion, GaleriaFoto } from '@/features/secciones/types'
import { simularMovimientoReducido } from '@/test/movimiento'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { claseMosaico } from '@/lib/escalas-bloque'
import { BloqueColumnas } from './BloqueColumnas'
import { BloqueGaleria } from './BloqueGaleria'
import { BloqueLogros } from './BloqueLogros'
import { TituloBloque } from './TituloBloque'

/** Fase 7j: título opcional, portada dentro de columnas y galería ampliada. */

function foto(n: number, titulo?: string): GaleriaFoto {
  return {
    media_id: `media-${n}`,
    titulo,
    media: {
      id: `media-${n}`,
      url: `https://ejemplo.com/foto-${n}.jpg`,
      s3_key: `galeria/abc/foto-${n}.jpg`,
      tipo: 'imagen',
      ancho: 800,
      alto: 600,
      alt_text: null,
      created_at: '2025-01-01T00:00:00.000Z',
    },
  }
}

const FOTOS = [foto(1, 'Playa'), foto(2, 'Montaña'), foto(3), foto(4), foto(5), foto(6), foto(7)]

function galeria(config: Partial<GaleriaConfiguracion>) {
  return render(<BloqueGaleria titulo="Galería" config={{ fotos: FOTOS, ...config }} />)
}

describe('título del bloque visible u oculto (Fase 7j, UC-07)', () => {
  it('por defecto (clave ausente) el título se ve', () => {
    render(<TituloBloque titulo="Logros" />)
    expect(screen.getByRole('heading', { name: 'Logros', level: 2 })).not.toHaveClass('sr-only')
  })

  it('oculto queda solo para lectores de pantalla', () => {
    render(<BloqueLogros titulo="Logros" config={{ mostrar_titulo: false }} logros={[]} />)
    const titulo = screen.getByRole('heading', { name: 'Logros', level: 2 })
    expect(titulo).toHaveClass('sr-only')
    expect(titulo).toHaveAttribute('data-titulo-oculto', 'true')
  })
})

describe('portada dentro de una columna (Fase 7j, UC-17)', () => {
  it('se pinta compacta y sin indicador de scroll', () => {
    const { container } = render(
      <MemoryRouter>
        <BloqueColumnas
          config={{
            distribucion: '1-1',
            alineacion_vertical: 'inicio',
            espaciado: 'normal',
            columna_1: [
              {
                tipo_seccion: 'hero',
                titulo_visible: 'Portada',
                visible: true,
                configuracion: {
                  titulo: 'Hola, soy Ada',
                  subtitulo: 'Ingeniera',
                  tamano_titulo: 'grande',
                  altura: 'pantalla_completa',
                  mostrar_indicador_scroll: true,
                },
              },
            ],
            columna_2: [],
            columna_3: [],
          }}
          datos={{
            perfil: null,
            proyectos: [],
            certificaciones: [],
            logros: [],
            redes_sociales: [],
            skills: [],
          }}
        />
      </MemoryRouter>,
    )
    const titulo = screen.getByRole('heading', { name: 'Hola, soy Ada', level: 2 })
    expect(titulo).toHaveClass('text-4xl')
    expect(titulo).not.toHaveClass('text-6xl')
    expect(container.querySelector('.min-h-\\[70vh\\]')).toBeInTheDocument()
    expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /siguiente|bajar/i })).not.toBeInTheDocument()
  })
})

describe('galería (Fase 7j, UC-18)', () => {
  afterEach(() => {
    simularMovimientoReducido(false)
    vi.useRealTimers()
  })

  it('mosaico: cada tanda (completa o final) ocupa filas completas de 4 columnas', () => {
    const area = (clase: string) =>
      (clase.includes('sm:col-span-4') ? 4 : clase.includes('col-span-2') ? 2 : 1) *
      (clase.includes('row-span-2') ? 2 : 1)
    for (let total = 1; total <= 21; total++) {
      let celdas = 0
      for (let i = 0; i < total; i++) celdas += area(claseMosaico(i, total))
      expect(celdas % 4).toBe(0)
    }
  })

  it('mosaico repite el patrón bento de tamaños', () => {
    const { container } = galeria({ disposicion: 'mosaico' })
    const celdas = container.querySelectorAll('[data-disposicion="mosaico"] > *')
    expect(celdas).toHaveLength(7)
    expect(celdas[0]).toHaveClass('col-span-2', 'row-span-2')
    expect(celdas[3]).toHaveClass('row-span-2')
    expect(celdas[4]).toHaveClass('col-span-2')
  })

  it('masonry usa columnas CSS y la proporción natural de cada foto', () => {
    const { container } = galeria({ disposicion: 'masonry', columnas_grid: 4 })
    expect(container.querySelector('[data-disposicion="masonry"]')).toHaveClass('lg:columns-4')
    expect(container.querySelector('img')).toHaveClass('h-auto')
    expect(container.querySelector('img')!.className).not.toContain('aspect-')
  })

  it('cinta duplica la pista; la copia no es enfocable ni se anuncia', () => {
    const { container } = galeria({ disposicion: 'cinta', velocidad_cinta: 'rapida' })
    const cinta = container.querySelector('[data-disposicion="cinta"]')!
    expect(cinta.querySelector('.galeria-cinta-pista')).toHaveStyle({ '--duracion-cinta': '24.5s' })
    expect(screen.getAllByRole('button', { name: 'Playa' })).toHaveLength(1)
    expect(cinta.querySelectorAll('[aria-hidden="true"][tabindex="-1"]')).toHaveLength(7)
  })

  it('cinta con movimiento reducido es una tira sin animación ni copia', () => {
    simularMovimientoReducido(true)
    const { container } = galeria({ disposicion: 'cinta' })
    expect(container.querySelector('.galeria-cinta-pista')).not.toBeInTheDocument()
    expect(container.querySelectorAll('img')).toHaveLength(7)
  })

  it('títulos sobre la foto: al pasar, siempre o nunca', () => {
    const { container, rerender } = galeria({ disposicion: 'grid', mostrar_titulos: 'al_pasar' })
    expect(container.querySelector('[data-titulo-foto="al_pasar"]')).toHaveClass('opacity-0')
    rerender(
      <BloqueGaleria
        titulo="Galería"
        config={{ fotos: FOTOS, disposicion: 'grid', mostrar_titulos: 'siempre' }}
      />,
    )
    expect(container.querySelector('[data-titulo-foto="siempre"]')).not.toHaveClass('opacity-0')
    rerender(<BloqueGaleria titulo="Galería" config={{ fotos: FOTOS, disposicion: 'grid' }} />)
    expect(container.querySelector('[data-titulo-foto]')).not.toBeInTheDocument()
  })

  it('sin ampliar al clic las fotos no son botones', () => {
    galeria({ disposicion: 'grid', ampliar_al_clic: false })
    expect(screen.queryByRole('button', { name: 'Playa' })).not.toBeInTheDocument()
  })

  it('proporción, separación y esquinas usan las tablas literales', () => {
    const { container } = galeria({
      disposicion: 'grid',
      proporcion: 'vertical',
      separacion: 'amplia',
      esquinas: 'redondeadas',
    })
    expect(container.querySelector('[data-disposicion="grid"]')).toHaveClass('gap-6')
    expect(container.querySelector('img')).toHaveClass('aspect-[3/4]')
    expect(screen.getByRole('button', { name: 'Playa' })).toHaveClass('rounded-2xl')
  })

  it('claves ausentes conservan el aspecto previo (grilla cuadrada, carrusel 16:9)', () => {
    const { container, rerender } = galeria({ disposicion: 'grid' })
    expect(container.querySelector('img')).toHaveClass('aspect-square')
    rerender(<BloqueGaleria titulo="Galería" config={{ fotos: FOTOS }} />)
    expect(container.querySelector('img')).toHaveClass('aspect-video')
  })

  it('grises: la foto está en gris hasta pasar el cursor', () => {
    const { container } = galeria({ disposicion: 'grid', efecto_hover: 'grises' })
    expect(container.querySelector('img')).toHaveClass('grayscale')
  })

  it('carrusel automático avanza, se pausa con el botón y al pasar el cursor', async () => {
    vi.useFakeTimers()
    const { container } = galeria({ reproduccion_automatica: true, intervalo_segundos: 3 })
    const carrusel = container.querySelector('[data-disposicion="carousel"]')!
    const pista = carrusel.firstElementChild as HTMLElement
    const scrollTo = vi.fn()
    pista.scrollTo = scrollTo
    expect(carrusel).toHaveAttribute('data-automatico', 'avanzando')

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(scrollTo).toHaveBeenCalledTimes(1)

    fireEvent.pointerEnter(carrusel)
    expect(carrusel).toHaveAttribute('data-automatico', 'pausado')
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(scrollTo).toHaveBeenCalledTimes(1)

    fireEvent.pointerLeave(carrusel)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar el carrusel' }))
    expect(screen.getByRole('button', { name: 'Reanudar el carrusel' })).toBeInTheDocument()
    expect(carrusel).toHaveAttribute('data-automatico', 'pausado')
  })

  it('el carrusel automático no avanza en el lienzo del editor ni con movimiento reducido', () => {
    const { container, unmount } = render(
      <ProveedorModoRenderizado modo="editor">
        <BloqueGaleria titulo="Galería" config={{ fotos: FOTOS, reproduccion_automatica: true }} />
      </ProveedorModoRenderizado>,
    )
    expect(container.querySelector('[data-automatico]')).not.toBeInTheDocument()
    unmount()

    simularMovimientoReducido(true)
    const otro = galeria({ reproduccion_automatica: true })
    expect(otro.container.querySelector('[data-automatico]')).not.toBeInTheDocument()
  })
})

describe('galería: correcciones de la revisión (Fase 7j)', () => {
  afterEach(() => vi.useRealTimers())

  it('la cinta tiene botón de pausa y en el lienzo queda quieta', () => {
    const { container, unmount } = galeria({ disposicion: 'cinta' })
    fireEvent.click(screen.getByRole('button', { name: 'Pausar la cinta' }))
    expect(container.querySelector('[data-disposicion="cinta"]')).toHaveAttribute('data-pausada', 'true')
    expect(screen.getByRole('button', { name: 'Reanudar la cinta' })).toBeInTheDocument()
    unmount()

    const enEditor = render(
      <ProveedorModoRenderizado modo="editor">
        <BloqueGaleria titulo="Galería" config={{ fotos: FOTOS, disposicion: 'cinta' }} />
      </ProveedorModoRenderizado>,
    )
    expect(enEditor.container.querySelector('.galeria-cinta-pista')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pausar la cinta' })).not.toBeInTheDocument()
  })

  it('el carrusel automático vuelve al inicio cuando el scroll no puede avanzar', async () => {
    vi.useFakeTimers()
    const { container } = galeria({ reproduccion_automatica: true, intervalo_segundos: 2 })
    const pista = container.querySelector('[data-disposicion="carousel"]')!.firstElementChild as HTMLElement
    Object.defineProperties(pista, {
      scrollLeft: { value: 900, configurable: true },
      clientWidth: { value: 600, configurable: true },
      scrollWidth: { value: 1500, configurable: true },
    })
    const scrollTo = vi.fn()
    pista.scrollTo = scrollTo
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('proporción "automatica" equivale a la clave ausente', () => {
    const { container } = galeria({ disposicion: 'grid', proporcion: 'automatica' })
    expect(container.querySelector('img')).toHaveClass('aspect-square')
  })
})
