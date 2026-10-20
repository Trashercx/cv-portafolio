import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InsigniaPublica } from '@/features/insignias/types'
import type { InsigniasConfiguracion } from '@/features/secciones/types'
import { simularMovimientoReducido } from '@/test/movimiento'
import { ProveedorModoRenderizado } from '../contexto-renderizado'
import { BloqueInsignias } from './BloqueInsignias'

/**
 * Fase 7l (UC-35): `disposicion` de insignias (`rejilla` | `carrusel` |
 * `cinta`), avance automático con pausa y cinta quieta en el lienzo y con
 * movimiento reducido. La clave ausente conserva la rejilla.
 */

function insignia(n: number): InsigniaPublica {
  return {
    id: `ins-${n}`,
    nombre: `Insignia ${n}`,
    emisor: `Emisor ${n}`,
    descripcion: null,
    proveedor: 'credly',
    url_verificacion: `https://www.credly.com/badges/${n}`,
    fecha_emision: '2025-03-10',
    fecha_expiracion: null,
    habilidades: [],
    orden: n,
    imagen: {
      id: `media-${n}`,
      url: `https://cdn.example.com/insignia-${n}.png`,
      s3_key: `insignias/insignia-${n}.png`,
      tipo: 'imagen',
      ancho: 600,
      alto: 600,
      alt_text: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  }
}

const OCHO = Array.from({ length: 8 }, (_, i) => insignia(i + 1))
const TRES = OCHO.slice(0, 3)

function bloque(config: Partial<InsigniasConfiguracion>, insignias = OCHO, modo?: 'editor') {
  const nodo = <BloqueInsignias titulo="Insignias" config={config} insignias={insignias} />
  return render(modo ? <ProveedorModoRenderizado modo={modo}>{nodo}</ProveedorModoRenderizado> : nodo)
}

afterEach(() => {
  vi.useRealTimers()
  simularMovimientoReducido(false)
})

describe('BloqueInsignias — disposición (Fase 7l, UC-35)', () => {
  it('clave ausente y "rejilla" pintan la rejilla de siempre', () => {
    for (const config of [{}, { disposicion: 'rejilla' as const }]) {
      const { container, unmount } = bloque(config)
      expect(container.querySelector('[data-estilo-insignias="medalla"]')).toBeInTheDocument()
      expect(container.querySelector('[data-disposicion]')).toBeNull()
      unmount()
    }
    const { container } = bloque({ estilo: 'tarjeta' })
    expect(container.querySelector('ul.grid')).toBeInTheDocument()
    expect(container.querySelector('[data-disposicion]')).toBeNull()
  })
})

describe('BloqueInsignias — carrusel (Fase 7l, UC-35)', () => {
  it('scroll-snap con flechas, un punto por insignia y anchos por tamaño', () => {
    const { container } = bloque({ disposicion: 'carrusel', tamano: 'compacto' })
    const carrusel = container.querySelector('[data-disposicion="carousel"]')!
    expect(carrusel.querySelector('.snap-x')).toBeInTheDocument()
    const items = carrusel.querySelectorAll('[data-item-insignia]')
    expect(items).toHaveLength(8)
    expect(items[0].parentElement).toHaveClass('snap-center', 'w-1/2', 'lg:w-1/5')
    expect(screen.getByRole('button', { name: 'Insignia anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insignia siguiente' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Ir a la insignia/ })).toHaveLength(8)
  })

  it('funciona con medallas (por defecto) y con tarjetas', () => {
    const medallas = bloque({ disposicion: 'carrusel' })
    expect(medallas.container.querySelectorAll('[data-efecto-medalla]').length).toBeGreaterThan(0)
    medallas.unmount()
    bloque({ disposicion: 'carrusel', estilo: 'tarjeta' })
    expect(screen.getAllByRole('heading', { level: 3, name: /Insignia/ })).toHaveLength(8)
  })

  it('sin reproducción automática no hay botón de pausa ni avance', async () => {
    vi.useFakeTimers()
    const { container } = bloque({ disposicion: 'carrusel' })
    expect(screen.queryByRole('button', { name: /Pausar el carrusel/ })).not.toBeInTheDocument()
    expect(container.querySelector('[data-automatico]')).toBeNull()
  })

  function prepararAuto(config: Partial<InsigniasConfiguracion>, modo?: 'editor') {
    vi.useFakeTimers()
    const resultado = bloque({ disposicion: 'carrusel', reproduccion_automatica: true, intervalo_segundos: 2, ...config }, OCHO, modo)
    const pista = resultado.container.querySelector('[data-disposicion="carousel"] .snap-x') as HTMLElement
    Object.defineProperties(pista, {
      scrollLeft: { value: 0, configurable: true },
      clientWidth: { value: 600, configurable: true },
      scrollWidth: { value: 2400, configurable: true },
    })
    const scrollTo = vi.fn()
    pista.scrollTo = scrollTo
    return { ...resultado, scrollTo }
  }

  it('el avance automático mueve el carrusel cada intervalo', async () => {
    const { scrollTo, container } = prepararAuto({})
    expect(container.querySelector('[data-automatico]')).toHaveAttribute('data-automatico', 'avanzando')
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(scrollTo).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(scrollTo).toHaveBeenCalledTimes(3)
  })

  it('se pausa al pasar el cursor, al enfocar y con el botón', async () => {
    const { scrollTo, container } = prepararAuto({})
    const raiz = container.querySelector('[data-disposicion="carousel"]')!

    fireEvent.pointerEnter(raiz)
    expect(raiz).toHaveAttribute('data-automatico', 'pausado')
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(scrollTo).not.toHaveBeenCalled()
    fireEvent.pointerLeave(raiz)
    expect(raiz).toHaveAttribute('data-automatico', 'avanzando')

    fireEvent.focus(raiz)
    expect(raiz).toHaveAttribute('data-automatico', 'pausado')
    fireEvent.blur(raiz)

    fireEvent.click(screen.getByRole('button', { name: 'Pausar el carrusel' }))
    expect(raiz).toHaveAttribute('data-automatico', 'pausado')
    expect(screen.getByRole('button', { name: 'Reanudar el carrusel' })).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('no avanza con la pestaña oculta', async () => {
    const { scrollTo } = prepararAuto({})
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('no avanza en el lienzo del editor ni con movimiento reducido', async () => {
    const enEditor = prepararAuto({}, 'editor')
    expect(enEditor.container.querySelector('[data-automatico]')).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(enEditor.scrollTo).not.toHaveBeenCalled()
    enEditor.unmount()

    simularMovimientoReducido(true)
    const reducido = prepararAuto({})
    expect(reducido.container.querySelector('[data-automatico]')).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(reducido.scrollTo).not.toHaveBeenCalled()
  })

  it('al llegar al final vuelve al inicio', async () => {
    const { scrollTo, container } = prepararAuto({})
    const pista = container.querySelector('[data-disposicion="carousel"] .snap-x') as HTMLElement
    Object.defineProperty(pista, 'scrollLeft', { value: 1800, configurable: true })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })
})

describe('BloqueInsignias — cinta (Fase 7l, UC-35)', () => {
  it('lleva la pista animada con la duración por velocidad y una copia que no se anuncia ni se enfoca', () => {
    const { container } = bloque({ disposicion: 'cinta', velocidad_cinta: 'rapida' })
    const pista = container.querySelector('.cinta-pista') as HTMLElement
    expect(pista).toBeInTheDocument()
    // 8 insignias x 2.5 s = 20 s (por encima del mínimo de 14 s).
    expect(pista).toHaveStyle({ '--duracion-cinta': '20s' })
    const copias = container.querySelectorAll('[data-item-insignia][aria-hidden="true"]')
    expect(copias).toHaveLength(8)
    for (const copia of copias) expect(copia).toHaveAttribute('inert')
    // Las insignias originales siguen en el árbol de accesibilidad.
    expect(container.querySelectorAll('[data-item-insignia]:not([aria-hidden])')).toHaveLength(8)
  })

  it('con pocas insignias las repite dentro de cada vuelta para llenar el ancho', () => {
    const { container } = bloque({ disposicion: 'cinta' }, TRES)
    // 3 insignias -> 3 repeticiones por vuelta (9 elementos), la vuelta y su copia.
    expect(container.querySelectorAll('[data-item-insignia]')).toHaveLength(18)
    expect(container.querySelectorAll('[data-item-insignia]:not([aria-hidden])')).toHaveLength(3)
  })

  it('el botón de pausa detiene y reanuda la cinta', () => {
    const { container } = bloque({ disposicion: 'cinta' })
    fireEvent.click(screen.getByRole('button', { name: 'Pausar la cinta' }))
    expect(container.querySelector('[data-disposicion="cinta"]')).toHaveAttribute('data-pausada', 'true')
    expect(container.querySelector('.cinta-pista')).toHaveClass('[animation-play-state:paused]')
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar la cinta' }))
    expect(container.querySelector('[data-disposicion="cinta"]')).not.toHaveAttribute('data-pausada')
  })

  it('en el lienzo y con movimiento reducido queda quieta, con una sola vuelta y sin botón', () => {
    const enEditor = bloque({ disposicion: 'cinta' }, TRES, 'editor')
    expect(enEditor.container.querySelector('.cinta-pista')).toBeNull()
    expect(enEditor.container.querySelectorAll('[data-item-insignia]')).toHaveLength(3)
    expect(enEditor.container.querySelector('[data-disposicion="cinta"]')).toHaveClass('overflow-x-auto')
    expect(screen.queryByRole('button', { name: /cinta/ })).not.toBeInTheDocument()
    enEditor.unmount()

    simularMovimientoReducido(true)
    const reducido = bloque({ disposicion: 'cinta' })
    expect(reducido.container.querySelector('.cinta-pista')).toBeNull()
    expect(reducido.container.querySelectorAll('[data-item-insignia]')).toHaveLength(8)
    expect(screen.queryByRole('button', { name: /cinta/ })).not.toBeInTheDocument()
  })

  it('funciona con tarjetas', () => {
    const { container } = bloque({ disposicion: 'cinta', estilo: 'tarjeta' })
    expect(container.querySelector('.cinta-pista')).toBeInTheDocument()
    expect(container.querySelector('[data-item-insignia]')).toHaveClass('w-48')
    expect(screen.getAllByRole('heading', { level: 3, name: 'Insignia 1' })).toHaveLength(1)
  })

  it('sin insignias muestra "Sin insignias" solo en el lienzo', () => {
    const publico = bloque({ disposicion: 'cinta' }, [])
    expect(publico.container).toBeEmptyDOMElement()
    publico.unmount()
    bloque({ disposicion: 'carrusel' }, [], 'editor')
    expect(screen.getByText('Sin insignias')).toBeInTheDocument()
  })
})
