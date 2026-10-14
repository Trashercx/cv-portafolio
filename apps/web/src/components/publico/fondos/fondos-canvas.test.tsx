import { act, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FondoAnimado, type ModoFondo } from '../FondoAnimado'
import { usePunteroRelativo, type PosicionPuntero } from './hooks/usePunteroRelativo'
import { useScrollRelativo } from './hooks/useScrollRelativo'

/**
 * Fase 7b (UC-15): los canvas (`particulas_red`, `campo_estrellas`) se montan
 * y desmontan sin fugas (rAF, `IntersectionObserver`, `ResizeObserver`,
 * listeners) y los hooks de puntero/scroll respetan sus condiciones de
 * inactividad. jsdom no trae canvas 2D: se simula un contexto inerte.
 */

const CONFIG = { velocidad: 'media', opacidad: 0.5, intensidad: 'media', interactivo: true }
const CANVAS = ['particulas_red', 'campo_estrellas'] as const

const matchMediaOriginal = window.matchMedia
const IntersectionObserverOriginal = window.IntersectionObserver
const ResizeObserverOriginal = window.ResizeObserver

let observadoresInterseccion: Array<{ observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; notificar: (visible: boolean) => void }>
let observadoresTamano: Array<{ disconnect: ReturnType<typeof vi.fn> }>
let rafSpy: ReturnType<typeof vi.spyOn>
let cafSpy: ReturnType<typeof vi.spyOn>
let cuadros: Map<number, FrameRequestCallback>
let siguienteId: number

/** Cuenta los dibujos reales (ambos canvas llaman a `clearRect` una vez por cuadro dibujado). */
const clearRectSpy = vi.fn()

function contextoFalso() {
  return new Proxy(
    {},
    {
      get: (_destino, propiedad) =>
        propiedad === 'canvas'
          ? undefined
          : propiedad === 'clearRect'
            ? clearRectSpy
            : () => undefined,
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D
}

function simularMedia(coincide: (consulta: string) => boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: coincide(consulta),
    media: consulta,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  clearRectSpy.mockClear()
  observadoresInterseccion = []
  observadoresTamano = []
  cuadros = new Map()
  siguienteId = 0

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => contextoFalso()) as unknown as HTMLCanvasElement['getContext'],
  )
  rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    siguienteId += 1
    cuadros.set(siguienteId, cb)
    return siguienteId
  })
  cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    cuadros.delete(id)
  })

  window.IntersectionObserver = class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = () => []
    private alCambiar: IntersectionObserverCallback
    constructor(alCambiar: IntersectionObserverCallback) {
      this.alCambiar = alCambiar
      observadoresInterseccion.push({
        observe: this.observe,
        disconnect: this.disconnect,
        notificar: (visible) =>
          this.alCambiar(
            [{ isIntersecting: visible } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      })
    }
  } as unknown as typeof window.IntersectionObserver
  window.ResizeObserver = class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    constructor() {
      observadoresTamano.push({ disconnect: this.disconnect })
    }
  } as unknown as typeof window.ResizeObserver
})

afterEach(() => {
  window.matchMedia = matchMediaOriginal
  window.IntersectionObserver = IntersectionObserverOriginal
  window.ResizeObserver = ResizeObserverOriginal
  vi.restoreAllMocks()
})

/** Ejecuta los cuadros agendados con la marca de tiempo dada (cada uno agenda el siguiente). */
function ejecutarCuadro(marca: number) {
  const pendientes = [...cuadros.values()]
  cuadros.clear()
  act(() => pendientes.forEach((cb) => cb(marca)))
}

async function montar(tipo: (typeof CANVAS)[number], modo: ModoFondo = 'sitio') {
  const vista = render(<FondoAnimado fondo={{ tipo, configuracion: CONFIG }} modo={modo} />)
  await waitFor(() => expect(vista.container.querySelector('canvas')).not.toBeNull())
  return vista
}

describe.each(CANVAS)('canvas %s', (tipo) => {
  it('arranca el bucle rAF en el sitio y lo limpia por completo al desmontar', async () => {
    const { unmount } = await montar(tipo)

    // El bucle arranca en un efecto posterior al montaje del canvas: se espera
    // (bajo carga, la corrida completa de vitest fallaba al afirmar de inmediato).
    await waitFor(() => expect(rafSpy).toHaveBeenCalled())
    expect(observadoresInterseccion.length).toBeGreaterThan(0)
    expect(observadoresTamano.length).toBeGreaterThan(0)

    // Dos cuadros reales ejecutan `dibujar` sin lanzar.
    ejecutarCuadro(1000)
    ejecutarCuadro(1100)

    unmount()

    expect(cuadros.size).toBe(0)
    expect(cafSpy).toHaveBeenCalled()
    for (const o of observadoresInterseccion) expect(o.disconnect).toHaveBeenCalled()
    for (const o of observadoresTamano) expect(o.disconnect).toHaveBeenCalled()
  })

  it('en miniatura corre a 20 fps como máximo y sin listeners de puntero', async () => {
    const alta = vi.spyOn(window, 'addEventListener')
    const { unmount } = await montar(tipo, 'miniatura')
    await waitFor(() => expect(rafSpy).toHaveBeenCalled())
    // A 20 fps (50 ms) un cuadro a 10 ms del anterior no dibuja, pero sigue agendando.
    ejecutarCuadro(1000)
    const tras1000 = clearRectSpy.mock.calls.length
    expect(tras1000).toBeGreaterThan(0)
    ejecutarCuadro(1010)
    expect(clearRectSpy.mock.calls.length).toBe(tras1000)
    expect(cuadros.size).toBeGreaterThan(0)
    ejecutarCuadro(1060)
    expect(clearRectSpy.mock.calls.length).toBe(tras1000 + 1)
    const tipos = alta.mock.calls.map((c) => c[0])
    expect(tipos).not.toContain('pointermove')
    expect(tipos).not.toContain('scroll')
    unmount()
    expect(cuadros.size).toBe(0)
  })

  it('con prefers-reduced-motion no usa requestAnimationFrame', async () => {
    simularMedia((c) => c.includes('prefers-reduced-motion'))
    await montar(tipo)
    expect(rafSpy).not.toHaveBeenCalled()
  })

  it('en el editor corre el bucle (animación sí, a 30 fps como máximo)', async () => {
    const { unmount } = await montar(tipo, 'editor')
    await waitFor(() => expect(rafSpy).toHaveBeenCalled())
    // Con tope de 30 fps un cuadro a 10 ms del anterior no dibuja, pero sigue agendando.
    ejecutarCuadro(1000)
    const tras1000 = clearRectSpy.mock.calls.length
    expect(tras1000).toBeGreaterThan(0)
    ejecutarCuadro(1010)
    expect(clearRectSpy.mock.calls.length).toBe(tras1000)
    expect(cuadros.size).toBeGreaterThan(0)
    ejecutarCuadro(1040)
    expect(clearRectSpy.mock.calls.length).toBe(tras1000 + 1)
    unmount()
    expect(cuadros.size).toBe(0)
  })

  it('se pausa cuando el canvas sale del viewport y se reanuda al volver', async () => {
    const { unmount } = await montar(tipo)
    // El bucle arranca en un efecto posterior: se espera al primer cuadro agendado
    // (bajo carga, afirmar de inmediato dejaba la cuenta en 0 y fallaba).
    await waitFor(() => expect(cuadros.size).toBe(1))
    const observador = observadoresInterseccion[observadoresInterseccion.length - 1]

    act(() => observador.notificar(false))
    expect(cuadros.size).toBe(0)

    act(() => observador.notificar(true))
    expect(cuadros.size).toBe(1)
    unmount()
  })

  it('se pausa con document.hidden y se reanuda al volver a ser visible', async () => {
    const { unmount } = await montar(tipo)
    const oculto = vi.spyOn(document, 'hidden', 'get')

    oculto.mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(cuadros.size).toBe(0)

    oculto.mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(cuadros.size).toBe(1)
    unmount()
  })

  it('limita el DPR a 1,5', async () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 200,
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    const { container, unmount } = await montar(tipo)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(600)
    expect(canvas.height).toBe(300)
    unmount()
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true })
  })
})

type SondaProps = {
  activo: boolean
  alMover: (p: PosicionPuntero | null) => void
}

function SondaPuntero({ activo, alMover }: SondaProps) {
  const ref = useRef<HTMLDivElement>(null)
  usePunteroRelativo(ref, activo, alMover)
  return <div ref={ref} data-testid="sonda" />
}

function SondaScroll({
  activo,
  alScroll,
}: {
  activo: boolean
  alScroll: (e: { valor: number; progreso: number }) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useScrollRelativo(ref, activo, alScroll)
  return <div ref={ref} />
}

/** Ejecuta los rAF pendientes (el hook acopla el aviso al siguiente cuadro). */
function vaciarCuadros() {
  const pendientes = [...cuadros.values()]
  cuadros.clear()
  act(() => pendientes.forEach((cb) => cb(16)))
}

describe('usePunteroRelativo', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 100,
      top: 10,
      left: 20,
      right: 220,
      bottom: 110,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    })
  })

  it('informa la posición relativa 0–1 acoplada a un rAF', () => {
    const alMover = vi.fn()
    render(<SondaPuntero activo alMover={alMover} />)

    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 120, clientY: 60 }))
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 120, clientY: 60 }))
    })
    // Dos eventos en el mismo cuadro: un solo aviso.
    expect(alMover).not.toHaveBeenCalled()
    vaciarCuadros()
    expect(alMover).toHaveBeenCalledTimes(1)
    expect(alMover).toHaveBeenCalledWith({ x: 0.5, y: 0.5, px: 100, py: 50 })
  })

  it('el listener es pasivo y se retira al desmontar', () => {
    const agregar = vi.spyOn(window, 'addEventListener')
    const quitar = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<SondaPuntero activo alMover={vi.fn()} />)
    expect(agregar).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true })
    unmount()
    expect(quitar).toHaveBeenCalledWith('pointermove', expect.any(Function))
  })

  it('no registra nada con activo=false', () => {
    const agregar = vi.spyOn(window, 'addEventListener')
    render(<SondaPuntero activo={false} alMover={vi.fn()} />)
    expect(agregar).not.toHaveBeenCalledWith('pointermove', expect.anything(), expect.anything())
  })

  it('no registra nada con prefers-reduced-motion', () => {
    simularMedia((c) => c.includes('prefers-reduced-motion'))
    const agregar = vi.spyOn(window, 'addEventListener')
    render(<SondaPuntero activo alMover={vi.fn()} />)
    expect(agregar).not.toHaveBeenCalledWith('pointermove', expect.anything(), expect.anything())
  })

  it('no registra nada con (hover: none)', () => {
    simularMedia((c) => c.includes('hover: none'))
    const agregar = vi.spyOn(window, 'addEventListener')
    render(<SondaPuntero activo alMover={vi.fn()} />)
    expect(agregar).not.toHaveBeenCalledWith('pointermove', expect.anything(), expect.anything())
  })
})

describe('useScrollRelativo', () => {
  it('informa el scroll acoplado a un rAF y se limpia al desmontar', () => {
    const alScroll = vi.fn()
    const { unmount } = render(<SondaScroll activo alScroll={alScroll} />)

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    vaciarCuadros()
    expect(alScroll).toHaveBeenCalledTimes(1)
    expect(alScroll.mock.calls[0][0]).toMatchObject({ valor: expect.any(Number) })

    unmount()
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(cuadros.size).toBe(0)
  })

  it('no escucha con activo=false', () => {
    const agregar = vi.spyOn(window, 'addEventListener')
    render(<SondaScroll activo={false} alScroll={vi.fn()} />)
    expect(agregar).not.toHaveBeenCalledWith('scroll', expect.anything(), expect.anything())
  })
})
