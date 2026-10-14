import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useEliminarMediaLote,
  useMediaList,
  useMediaUsos,
} from './useMediaLibrary'

const fetchMock = vi.fn()

function respuestaJson(datos: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(datos), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function envoltorio() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidar = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidar }
}

describe('hooks de la biblioteca (Fase 7d, UC-09)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockImplementation(() => respuestaJson([]))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('useMediaList manda tipo, q y orden como query string y omite los valores por defecto', async () => {
    const { wrapper } = envoltorio()
    const { result } = renderHook(
      () => useMediaList({ tipo: 'imagen', q: ' logo ', orden: 'nombre' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/media\?tipo=imagen&q=logo&orden=nombre$/)

    fetchMock.mockClear()
    const sinFiltros = renderHook(() => useMediaList(), { wrapper })
    await waitFor(() => expect(sinFiltros.result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/media$/)
  })

  it('useMediaList acepta un string como filtro de tipo (formularios)', async () => {
    const { wrapper } = envoltorio()
    const { result } = renderHook(() => useMediaList('pdf'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/media\?tipo=pdf$/)
  })

  it('useMediaUsos pide /admin/media/usos', async () => {
    fetchMock.mockImplementation(() =>
      respuestaJson({ m1: [{ tipo: 'proyecto', id: 'p1', nombre: 'Mi proyecto' }] }),
    )
    const { wrapper } = envoltorio()
    const { result } = renderHook(() => useMediaUsos(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/admin\/media\/usos$/)
    expect(result.current.data?.m1[0].nombre).toBe('Mi proyecto')
  })

  it('useEliminarMediaLote hace POST con los ids, devuelve el resultado e invalida la biblioteca', async () => {
    fetchMock.mockImplementation(() =>
      respuestaJson({ eliminados: ['a'], omitidos: [{ id: 'b', motivo: 'En uso' }] }),
    )
    const { wrapper, invalidar } = envoltorio()
    const { result } = renderHook(() => useEliminarMediaLote(), { wrapper })

    const resultado = await result.current.mutateAsync(['a', 'b'])

    const [url, opciones] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/admin\/media\/eliminar-lote$/)
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ ids: ['a', 'b'] })
    expect(opciones.credentials).toBe('include')
    expect(resultado.omitidos[0].motivo).toBe('En uso')
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['media'] })
  })
})
