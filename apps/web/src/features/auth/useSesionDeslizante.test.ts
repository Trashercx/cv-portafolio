import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth-store'
import { apiFetch } from '@/lib/api-client'
import {
  INTERVALO_REVISION_MS,
  MARGEN_RENOVACION_MS,
  useSesionDeslizante,
} from './useSesionDeslizante'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

const INICIO = new Date('2026-01-01T00:00:00.000Z').getTime()
const MINUTO = 60_000

function iniciarSesion(venceEnMs: number) {
  useAuthStore.setState({
    admin: {
      email: 'admin@example.com',
      nombre: 'Oscar',
      expiresAt: new Date(Date.now() + venceEnMs).toISOString(),
    },
    isAuthenticated: true,
  })
}

/** Avanza el reloj en pasos de revisión y deja resolver las promesas. */
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useSesionDeslizante (Fase 7j, UC-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(INICIO)
    useAuthStore.setState({ admin: null, isAuthenticated: false })
    vi.mocked(apiFetch).mockReset()
    vi.mocked(apiFetch).mockImplementation(async () => ({
      email: 'admin@example.com',
      nombre: 'Oscar',
      expiresAt: new Date(Date.now() + 15 * MINUTO).toISOString(),
    }))
  })

  afterEach(() => {
    useAuthStore.setState({ admin: null, isAuthenticated: false })
    vi.useRealTimers()
  })

  it('con actividad renueva el token al entrar en el margen final', async () => {
    iniciarSesion(15 * MINUTO)
    renderHook(() => useSesionDeslizante())

    // A los 9 min (quedan 6): todavía no toca aunque haya actividad.
    await avanzar(9 * MINUTO)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown'))
    })
    await avanzar(INTERVALO_REVISION_MS)
    expect(apiFetch).not.toHaveBeenCalled()

    // Al entrar en los últimos 5 min, con la actividad reciente, renueva.
    await avanzar(MINUTO)
    expect(apiFetch).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' })
    expect(new Date(useAuthStore.getState().admin!.expiresAt).getTime()).toBeGreaterThan(
      INICIO + 15 * MINUTO,
    )
  })

  it('sin actividad no renueva y deja vencer la sesión', async () => {
    iniciarSesion(15 * MINUTO)
    renderHook(() => useSesionDeslizante())
    await avanzar(15 * MINUTO)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('cuenta la actividad dentro de un iframe del mismo origen (lienzo de Puck)', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    iniciarSesion(MARGEN_RENOVACION_MS + 2 * MINUTO)
    renderHook(() => useSesionDeslizante())

    await avanzar(6 * MINUTO)
    act(() => {
      iframe.contentDocument!.dispatchEvent(new Event('pointerdown'))
    })
    await avanzar(INTERVALO_REVISION_MS)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    iframe.remove()
  })

  it('no renueva dos veces por la misma actividad', async () => {
    iniciarSesion(4 * MINUTO)
    vi.mocked(apiFetch).mockImplementation(async () => ({
      email: 'admin@example.com',
      nombre: 'Oscar',
      expiresAt: new Date(Date.now() + 4 * MINUTO).toISOString(),
    }))
    renderHook(() => useSesionDeslizante())
    act(() => {
      document.dispatchEvent(new Event('pointerdown'))
    })
    await avanzar(INTERVALO_REVISION_MS)
    expect(apiFetch).toHaveBeenCalledTimes(1)

    // Sin actividad nueva, aunque siga dentro del margen, no vuelve a pedir.
    await avanzar(2 * MINUTO)
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('un refresh fallido es silencioso y no revive una sesión cerrada', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('401'))
    iniciarSesion(4 * MINUTO)
    renderHook(() => useSesionDeslizante())
    act(() => {
      document.dispatchEvent(new Event('keydown'))
    })
    await avanzar(INTERVALO_REVISION_MS)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().admin).not.toBeNull()
  })
})

describe('useSincronizarSesionEntrePestanas (Fase 7j, UC-01)', () => {
  /** BroadcastChannel falso que entrega a todas las instancias del mismo nombre menos al emisor. */
  class CanalFalso {
    static instancias: CanalFalso[] = []
    onmessage: ((evento: MessageEvent) => void) | null = null
    nombre: string
    constructor(nombre: string) {
      this.nombre = nombre
      CanalFalso.instancias.push(this)
    }
    postMessage(data: unknown) {
      for (const otro of CanalFalso.instancias) {
        if (otro !== this && otro.nombre === this.nombre) otro.onmessage?.({ data } as MessageEvent)
      }
    }
    close() {
      CanalFalso.instancias = CanalFalso.instancias.filter((c) => c !== this)
    }
  }

  const original = globalThis.BroadcastChannel
  beforeEach(() => {
    CanalFalso.instancias = []
    globalThis.BroadcastChannel = CanalFalso as unknown as typeof BroadcastChannel
    useAuthStore.setState({ admin: null, isAuthenticated: false })
  })
  afterEach(() => {
    globalThis.BroadcastChannel = original
    useAuthStore.setState({ admin: null, isAuthenticated: false })
  })

  it('anuncia una renovación y adopta la de otra pestaña solo si es posterior', async () => {
    const { useSincronizarSesionEntrePestanas, CANAL_SESION } = await import('./useSesionDeslizante')
    useAuthStore.setState({
      admin: { email: 'a@b.c', nombre: 'Oscar', expiresAt: '2026-01-01T00:15:00.000Z' },
      isAuthenticated: true,
    })
    renderHook(() => useSincronizarSesionEntrePestanas())
    const otraPestana = new CanalFalso(CANAL_SESION)
    const recibidos: unknown[] = []
    otraPestana.onmessage = (evento) => recibidos.push(evento.data)

    // Esta pestaña renueva: la otra se entera.
    act(() => {
      useAuthStore.getState().setAdmin({ email: 'a@b.c', nombre: 'Oscar', expiresAt: '2026-01-01T00:30:00.000Z' })
    })
    expect(recibidos).toEqual([{ tipo: 'renovada', expiresAt: '2026-01-01T00:30:00.000Z' }])

    // La otra pestaña renovó después: esta adopta el vencimiento sin reenviarlo.
    act(() => {
      otraPestana.postMessage({ tipo: 'renovada', expiresAt: '2026-01-01T00:45:00.000Z' })
    })
    expect(useAuthStore.getState().admin?.expiresAt).toBe('2026-01-01T00:45:00.000Z')
    expect(recibidos).toHaveLength(1)

    // Un vencimiento anterior se ignora.
    act(() => {
      otraPestana.postMessage({ tipo: 'renovada', expiresAt: '2026-01-01T00:20:00.000Z' })
    })
    expect(useAuthStore.getState().admin?.expiresAt).toBe('2026-01-01T00:45:00.000Z')
  })

  it('no revive una pestaña que ya cerró sesión', async () => {
    const { useSincronizarSesionEntrePestanas, CANAL_SESION } = await import('./useSesionDeslizante')
    renderHook(() => useSincronizarSesionEntrePestanas())
    const otraPestana = new CanalFalso(CANAL_SESION)
    act(() => {
      otraPestana.postMessage({ tipo: 'renovada', expiresAt: '2030-01-01T00:00:00.000Z' })
    })
    expect(useAuthStore.getState().admin).toBeNull()
  })
})
