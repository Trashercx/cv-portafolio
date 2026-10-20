import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EXPERIENCIAS_QUERY_KEY,
  useActualizarExperiencia,
  useCrearExperiencia,
  useEliminarExperiencia,
  useExperiencias,
  useReordenarExperiencias,
} from './useExperiencias'

/** Fase 7l, UC-19: los hooks hablan con `admin/experiencias` con `fetch` mockeado. */

const fetchMock = vi.fn()

function respuestaJson(cuerpo: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(cuerpo),
  })
}

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
  return { url, init, body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body }
}

describe('hooks de experiencias', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('useExperiencias hace GET /admin/experiencias', async () => {
    fetchMock.mockReturnValue(respuestaJson([{ id: 'e1' }]))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useExperiencias(), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'e1' }]))
    expect(ultimaLlamada().url).toMatch(/\/admin\/experiencias$/)
  })

  it('useCrearExperiencia hace POST e invalida la lista', async () => {
    fetchMock.mockReturnValue(respuestaJson({ id: 'nueva' }))
    const { wrapper, invalidar } = crearWrapper()
    const { result } = renderHook(() => useCrearExperiencia(), { wrapper })

    await act(() =>
      result.current.mutateAsync({
        empresa: 'Acme',
        cargo: 'Dev',
        descripcion: 'x',
        fecha_inicio: '2024-01-01',
        fecha_fin: null,
        ubicacion: null,
        modalidad: 'remoto',
        url_empresa: null,
        logo_media_id: null,
        tecnologias: ['React'],
        visible: true,
      }),
    )

    const { url, init, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/experiencias$/)
    expect(init.method).toBe('POST')
    expect(body).toMatchObject({ fecha_fin: null, tecnologias: ['React'] })
    expect(invalidar).toHaveBeenCalledWith({ queryKey: EXPERIENCIAS_QUERY_KEY })
  })

  it('useActualizarExperiencia hace PATCH por id', async () => {
    fetchMock.mockReturnValue(respuestaJson({ id: 'e1' }))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useActualizarExperiencia(), { wrapper })
    await act(() => result.current.mutateAsync({ id: 'e1', payload: { visible: false } }))
    const { url, init, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/experiencias\/e1$/)
    expect(init.method).toBe('PATCH')
    expect(body).toEqual({ visible: false })
  })

  it('useEliminarExperiencia hace DELETE por id', async () => {
    fetchMock.mockReturnValue(respuestaJson({ eliminado: true }))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useEliminarExperiencia(), { wrapper })
    await act(() => result.current.mutateAsync('e1'))
    const { url, init } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/experiencias\/e1$/)
    expect(init.method).toBe('DELETE')
  })

  it('useReordenarExperiencias envía un array plano [{ id, orden }]', async () => {
    fetchMock.mockReturnValue(respuestaJson({ actualizados: 2 }))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useReordenarExperiencias(), { wrapper })
    await act(() =>
      result.current.mutateAsync([
        { id: 'a', orden: 1 },
        { id: 'b', orden: 0 },
      ]),
    )
    const { url, init, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/experiencias\/reordenar$/)
    expect(init.method).toBe('PATCH')
    expect(body).toEqual([
      { id: 'a', orden: 1 },
      { id: 'b', orden: 0 },
    ])
  })
})
