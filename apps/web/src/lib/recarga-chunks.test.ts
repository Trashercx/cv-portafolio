import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recargarUnaVezPorUrl, registrarRecargaChunks } from './recarga-chunks'

describe('recarga-chunks (post-Fase 6, UC-07)', () => {
  const reload = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    window.sessionStorage.clear()
    reload.mockClear()
    vi.stubGlobal('location', { ...window.location, pathname: '/x', reload })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('recarga la primera vez, no dentro de 60 s y sí pasados 60 s', () => {
    expect(recargarUnaVezPorUrl()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30_000)
    expect(recargarUnaVezPorUrl()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(31_000)
    expect(recargarUnaVezPorUrl()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('usa una clave por pathname', () => {
    recargarUnaVezPorUrl()
    expect(window.sessionStorage.getItem('recarga-chunk:/x')).not.toBeNull()
  })

  it('el listener de vite:preloadError hace preventDefault solo si recarga', () => {
    const baja = registrarRecargaChunks()
    const primero = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(primero)
    expect(primero.defaultPrevented).toBe(true)

    const segundo = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(segundo)
    expect(segundo.defaultPrevented).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
    baja()
  })
})
