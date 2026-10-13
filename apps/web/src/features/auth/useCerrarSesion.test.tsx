import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth-store'
import { useCerrarSesion } from './useCerrarSesion'

const navigateMock = vi.fn()
const apiFetchMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/api-client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client')
  return { ...actual, apiFetch: (...args: unknown[]) => apiFetchMock(...args) }
})

describe('useCerrarSesion (Fase 6, UC-01)', () => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )

  beforeEach(() => {
    useAuthStore.setState({
      admin: { email: 'a@b.c', nombre: 'A', expiresAt: '2030-01-01T00:00:00Z' },
      isAuthenticated: true,
    })
    queryClient.setQueryData(['algo'], 1)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('llama POST /auth/logout y luego limpia store, caché y navega al login', async () => {
    apiFetchMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useCerrarSesion(), { wrapper })

    result.current.mutate()

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/admin/login', {
        replace: true,
      }),
    )
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
    })
    expect(useAuthStore.getState().admin).toBeNull()
    expect(queryClient.getQueryData(['algo'])).toBeUndefined()
  })

  it('cierra la sesión local aunque el servidor falle', async () => {
    apiFetchMock.mockRejectedValue(new Error('sin red'))
    const { result } = renderHook(() => useCerrarSesion(), { wrapper })

    result.current.mutate()

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1))
    expect(useAuthStore.getState().admin).toBeNull()
  })

  it('respeta un destino personalizado', async () => {
    apiFetchMock.mockResolvedValue(undefined)
    const { result } = renderHook(
      () => useCerrarSesion('/admin/login?sesion=expirada'),
      { wrapper },
    )

    result.current.mutate()

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        '/admin/login?sesion=expirada',
        { replace: true },
      ),
    )
  })
})
