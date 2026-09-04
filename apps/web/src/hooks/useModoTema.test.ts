import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useModoTema } from './useModoTema'

const STORAGE_KEY = 'sitio-publico-modo-tema'

/**
 * Mock mínimo de `MediaQueryList` con soporte real de `addEventListener`
 * (a diferencia del stub global de `src/test/setup.ts`, que siempre
 * responde `matches: false` y listeners no-op) para poder simular cambios
 * en vivo de `prefers-color-scheme`.
 */
function crearMatchMediaMock(matchesInicial: boolean) {
  let matches = matchesInicial
  const listeners = new Set<() => void>()
  const mql = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_evento: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_evento: string, listener: () => void) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => false,
  }
  const disparar = (siguiente: boolean) => {
    matches = siguiente
    listeners.forEach((listener) => listener())
  }
  return { mql, disparar }
}

describe('useModoTema', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sin override guardado, sigue prefers-color-scheme del sistema (claro)', () => {
    const { mql } = crearMatchMediaMock(false)
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const { result } = renderHook(() => useModoTema())

    expect(result.current.modo).toBe('claro')
  })

  it('sin override guardado, sigue prefers-color-scheme del sistema (oscuro)', () => {
    const { mql } = crearMatchMediaMock(true)
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const { result } = renderHook(() => useModoTema())

    expect(result.current.modo).toBe('oscuro')
  })

  it('reacciona en vivo a un cambio de prefers-color-scheme cuando no hay override', () => {
    const { mql, disparar } = crearMatchMediaMock(false)
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const { result } = renderHook(() => useModoTema())
    expect(result.current.modo).toBe('claro')

    act(() => {
      disparar(true)
    })

    expect(result.current.modo).toBe('oscuro')
  })

  it('un override manual persiste en localStorage y gana sobre la preferencia del sistema', () => {
    const { mql } = crearMatchMediaMock(false) // sistema en claro
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const { result } = renderHook(() => useModoTema())

    act(() => {
      result.current.setModo('oscuro')
    })

    expect(result.current.modo).toBe('oscuro')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('oscuro')
  })

  it('el override guardado se respeta en un render/reload posterior', () => {
    window.localStorage.setItem(STORAGE_KEY, 'oscuro')
    const { mql } = crearMatchMediaMock(false) // sistema en claro, pero hay override

    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const { result } = renderHook(() => useModoTema())

    expect(result.current.modo).toBe('oscuro')
  })

  it('setModo(null) borra el override y vuelve a seguir el sistema', () => {
    window.localStorage.setItem(STORAGE_KEY, 'oscuro')
    const { mql } = crearMatchMediaMock(false) // sistema en claro
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const { result } = renderHook(() => useModoTema())
    expect(result.current.modo).toBe('oscuro')

    act(() => {
      result.current.setModo(null)
    })

    expect(result.current.modo).toBe('claro')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  /**
   * Escenario real que justifica el `CustomEvent` interno (`useModoTema.ts`,
   * `EVENTO_CAMBIO_LOCAL`): `PublicHomePage` y `ToggleModoTema` montan cada
   * uno su propia instancia del hook. Sin el evento, `setModo` de una
   * instancia no movería el `useState` de la otra dentro de la misma
   * pestaña — a diferencia de `localStorage.getItem` (que sí comparten,
   * porque `localStorage` es un almacén compartido, no algo por-instancia),
   * el `useState` de cada instancia sí es independiente.
   */
  it('setModo de una instancia del hook actualiza el modo de otra instancia en la misma pestaña', () => {
    const { mql } = crearMatchMediaMock(false) // sistema en claro
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)

    const instanciaA = renderHook(() => useModoTema())
    const instanciaB = renderHook(() => useModoTema())

    expect(instanciaA.result.current.modo).toBe('claro')
    expect(instanciaB.result.current.modo).toBe('claro')

    act(() => {
      instanciaA.result.current.setModo('oscuro')
    })

    expect(instanciaA.result.current.modo).toBe('oscuro')
    expect(instanciaB.result.current.modo).toBe('oscuro')

    act(() => {
      instanciaB.result.current.setModo(null)
    })

    expect(instanciaA.result.current.modo).toBe('claro')
    expect(instanciaB.result.current.modo).toBe('claro')
  })
})
