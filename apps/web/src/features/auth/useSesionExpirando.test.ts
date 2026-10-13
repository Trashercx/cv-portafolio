import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth-store'
import { useSesionExpirando } from './useSesionExpirando'

/**
 * `useSesionExpirando` (Fase 4.4) es puramente por tiempo hasta
 * `admin.expiresAt`, recalculado con un `setInterval` de 1s — se testea con
 * fake timers de Vitest (que también fijan `Date`, ver `vi.useFakeTimers`)
 * para controlar el paso del tiempo sin esperas reales.
 */
describe('useSesionExpirando', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    useAuthStore.setState({ admin: null, isAuthenticated: false })
  })

  afterEach(() => {
    useAuthStore.setState({ admin: null, isAuthenticated: false })
    vi.useRealTimers()
  })

  it('no muestra el aviso mientras no hay sesión', () => {
    const { result } = renderHook(() => useSesionExpirando())

    expect(result.current.mostrarAviso).toBe(false)
    expect(result.current.segundosRestantes).toBe(0)
  })

  it('no muestra el aviso cuando faltan más de 60s para expirar', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 90_000).toISOString(),
      },
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useSesionExpirando())

    expect(result.current.mostrarAviso).toBe(false)
  })

  it('muestra el aviso apenas quedan 60s o menos para expirar', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 90_000).toISOString(),
      },
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useSesionExpirando())
    expect(result.current.mostrarAviso).toBe(false)

    // Pasan 31s: quedan 59s, por debajo del umbral de 60s.
    act(() => {
      vi.advanceTimersByTime(31_000)
    })

    expect(result.current.mostrarAviso).toBe(true)
    expect(result.current.segundosRestantes).toBeLessThanOrEqual(60)
  })

  it('el aviso desaparece solo cuando expiresAt se extiende (p. ej. tras un refresh exitoso)', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
      },
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useSesionExpirando())
    expect(result.current.mostrarAviso).toBe(true)

    act(() => {
      useAuthStore.getState().setAdmin({
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      })
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(result.current.mostrarAviso).toBe(false)
  })

  it('marca sesionExpirada solo cuando llegan a 0 los segundos restantes', () => {
    useAuthStore.setState({
      admin: {
        email: 'admin@example.com',
        nombre: 'Oscar',
        expiresAt: new Date(Date.now() + 3_000).toISOString(),
      },
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useSesionExpirando())
    expect(result.current.sesionExpirada).toBe(false)

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(result.current.segundosRestantes).toBe(0)
    expect(result.current.sesionExpirada).toBe(true)
  })
})
