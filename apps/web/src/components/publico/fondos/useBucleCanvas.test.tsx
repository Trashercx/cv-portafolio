import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBucleCanvas } from './hooks/useBucleCanvas'
import { analizarColor, esFondoClaro, oscurecerColor } from './utilidades'

/**
 * Fase 7b (UC-15): el `ResizeObserver` dispara su callback al `observe`; el
 * bucle no debe volver a preparar (regenerar partículas) si el tamaño no cambió.
 * También cubre `esFondoClaro` (QA visual: canvas visibles en tema claro).
 */

let notificarTamano: () => void
const ResizeObserverOriginal = window.ResizeObserver
let ancho = 400

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => new Proxy({}, { get: () => () => undefined, set: () => true })) as unknown as HTMLCanvasElement['getContext'],
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ width: ancho, height: 200, top: 0, left: 0, right: ancho, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
  )
  window.ResizeObserver = class {
    constructor(alCambiar: () => void) {
      notificarTamano = alCambiar
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver
})

afterEach(() => {
  window.ResizeObserver = ResizeObserverOriginal
  vi.restoreAllMocks()
  ancho = 400
})

function Prueba({ preparar }: { preparar: (w: number, h: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useBucleCanvas(ref, { estatico: true, maxFps: 30, clave: 'x', preparar, dibujar: () => {} })
  return <canvas ref={ref} />
}

describe('useBucleCanvas', () => {
  it('llama a preparar una sola vez al montar (ignora la notificación inicial del ResizeObserver)', () => {
    const preparar = vi.fn()
    render(<Prueba preparar={preparar} />)
    expect(preparar).toHaveBeenCalledTimes(1)

    act(() => notificarTamano())
    expect(preparar).toHaveBeenCalledTimes(1)
  })

  it('vuelve a preparar cuando el tamaño sí cambia', () => {
    const preparar = vi.fn()
    render(<Prueba preparar={preparar} />)
    ancho = 640
    act(() => notificarTamano())
    expect(preparar).toHaveBeenCalledTimes(2)
    expect(preparar).toHaveBeenLastCalledWith(640, 200)
  })
})

describe('esFondoClaro', () => {
  it('distingue fondos claros y oscuros en hex y rgb()', () => {
    expect(esFondoClaro('#ffffff')).toBe(true)
    expect(esFondoClaro('#f8fafc')).toBe(true)
    expect(esFondoClaro('rgb(250, 250, 250)')).toBe(true)
    expect(esFondoClaro('#0f172a')).toBe(false)
    expect(esFondoClaro('rgb(10, 10, 10)')).toBe(false)
    expect(esFondoClaro('#fff')).toBe(true)
  })

  it('trata un color ilegible como oscuro', () => {
    expect(esFondoClaro('currentColor')).toBe(false)
  })

  it('oscurecerColor mezcla con negro', () => {
    expect(analizarColor('#ff8000')).toEqual({ r: 255, g: 128, b: 0 })
    expect(oscurecerColor('#ffffff', 0.5)).toBe('rgb(128, 128, 128)')
    expect(oscurecerColor('no-color', 0.5)).toBe('no-color')
  })
})
