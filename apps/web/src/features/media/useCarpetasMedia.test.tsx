import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useCarpetasMedia,
  useCrearCarpeta,
  useEliminarCarpeta,
  useMoverMedia,
  useRenombrarCarpeta,
  useReordenarCarpetas,
} from './useCarpetasMedia'
import { useMediaList } from './useMediaLibrary'

// Hooks de carpetas con `fetch` simulado (Fase 7e, UC-09).
const fetchMock = vi.fn()

function crearWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidar = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidar }
}

function ultimaLlamada() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, metodo: init.method ?? 'GET', cuerpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('hooks de carpetas de la biblioteca (UC-09, Fase 7e)', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('useCarpetasMedia pide GET /admin/media/carpetas', async () => {
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useCarpetasMedia(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(ultimaLlamada()).toMatchObject({ metodo: 'GET' })
    expect(ultimaLlamada().url).toMatch(/\/admin\/media\/carpetas$/)
  })

  it.each([
    ['crear', () => useCrearCarpeta(), (m: ReturnType<typeof useCrearCarpeta>) => m.mutateAsync('Diplomas'), 'POST', '/admin/media/carpetas', { nombre: 'Diplomas' }],
    ['renombrar', () => useRenombrarCarpeta(), (m: ReturnType<typeof useRenombrarCarpeta>) => m.mutateAsync({ id: 'c1', nombre: 'Nuevo' }), 'PATCH', '/admin/media/carpetas/c1', { nombre: 'Nuevo' }],
    ['reordenar', () => useReordenarCarpetas(), (m: ReturnType<typeof useReordenarCarpetas>) => m.mutateAsync(['b', 'a']), 'PATCH', '/admin/media/carpetas/reordenar', { ids: ['b', 'a'] }],
    ['eliminar', () => useEliminarCarpeta(), (m: ReturnType<typeof useEliminarCarpeta>) => m.mutateAsync('c1'), 'DELETE', '/admin/media/carpetas/c1', undefined],
    ['mover', () => useMoverMedia(), (m: ReturnType<typeof useMoverMedia>) => m.mutateAsync({ ids: ['m1'], carpeta_id: null }), 'POST', '/admin/media/mover', { ids: ['m1'], carpeta_id: null }],
  ] as const)(
    '%s llama al endpoint correcto e invalida [media]',
    async (_nombre, usarHook, ejecutar, metodo, ruta, cuerpo) => {
      const { wrapper, invalidar } = crearWrapper()
      const { result } = renderHook(() => (usarHook as () => never)(), { wrapper })
      await act(async () => {
        await (ejecutar as (m: unknown) => Promise<unknown>)(result.current)
      })
      const llamada = ultimaLlamada()
      expect(llamada.metodo).toBe(metodo)
      expect(llamada.url.endsWith(ruta)).toBe(true)
      expect(llamada.cuerpo).toEqual(cuerpo)
      expect(invalidar).toHaveBeenCalledWith({ queryKey: ['media'] })
    },
  )

  it('useMediaList envía carpeta_id (uuid o "ninguna") y lo omite si no se indica', async () => {
    const { wrapper } = crearWrapper()
    const { result, rerender } = renderHook(
      ({ carpeta }: { carpeta?: string }) => useMediaList({ carpeta_id: carpeta }),
      { wrapper, initialProps: { carpeta: 'c1' } as { carpeta?: string } },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(ultimaLlamada().url).toMatch(/\/admin\/media\?carpeta_id=c1$/)

    rerender({ carpeta: 'ninguna' })
    await waitFor(() => expect(ultimaLlamada().url).toMatch(/carpeta_id=ninguna$/))

    rerender({ carpeta: undefined })
    await waitFor(() => expect(ultimaLlamada().url).toMatch(/\/admin\/media$/))
  })
})
