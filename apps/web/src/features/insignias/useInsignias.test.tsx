import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INSIGNIAS_QUERY_KEY,
  useActualizarInsignia,
  useCrearInsignia,
  useEliminarInsignia,
  useImportarArchivoInsignia,
  useImportarInsignia,
  useInsignias,
  useReordenarInsignias,
} from './useInsignias'

/** Fase 7d, UC-35: los hooks hablan con `admin/insignias` con `fetch` mockeado. */

const fetchMock = vi.fn()

function respuestaJson(cuerpo: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
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

describe('hooks de insignias', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('useInsignias hace GET /admin/insignias con cookie de sesión', async () => {
    fetchMock.mockReturnValue(respuestaJson([{ id: 'i1' }]))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useInsignias(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([{ id: 'i1' }]))
    const { url, init } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias$/)
    expect(init.credentials).toBe('include')
  })

  it('useCrearInsignia hace POST con imagen_url_remota e invalida insignias y media', async () => {
    fetchMock.mockReturnValue(respuestaJson({ id: 'nueva' }))
    const { wrapper, invalidar } = crearWrapper()
    const { result } = renderHook(() => useCrearInsignia(), { wrapper })

    await act(() =>
      result.current.mutateAsync({
        nombre: 'AWS',
        emisor: 'Amazon',
        imagen_url_remota: 'https://images.credly.com/a.png',
      }),
    )

    const { url, init, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias$/)
    expect(init.method).toBe('POST')
    expect(body).toMatchObject({ imagen_url_remota: 'https://images.credly.com/a.png' })
    expect(invalidar).toHaveBeenCalledWith({ queryKey: INSIGNIAS_QUERY_KEY })
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['media'] })
  })

  it('declara meta de éxito/error para los toasts', async () => {
    fetchMock.mockReturnValue(respuestaJson({ id: 'nueva' }))
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useCrearInsignia(), { wrapper })

    await act(() => result.current.mutateAsync({ nombre: 'A', emisor: 'B', imagen_media_id: 'm' }))

    const [mutacion] = queryClient.getMutationCache().getAll()
    expect(mutacion.meta).toMatchObject({
      mensajeExito: expect.stringContaining('Insignia'),
      mensajeError: expect.stringContaining('insignia'),
    })
  })

  it('useActualizarInsignia hace PATCH /admin/insignias/:id', async () => {
    fetchMock.mockReturnValue(respuestaJson({ id: 'i1' }))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useActualizarInsignia(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 'i1', payload: { visible: false } }))

    const { url, init, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias\/i1$/)
    expect(init.method).toBe('PATCH')
    expect(body).toEqual({ visible: false })
  })

  it('useEliminarInsignia hace DELETE /admin/insignias/:id', async () => {
    fetchMock.mockReturnValue(respuestaJson({}))
    const { wrapper, invalidar } = crearWrapper()
    const { result } = renderHook(() => useEliminarInsignia(), { wrapper })

    await act(() => result.current.mutateAsync('i1'))

    const { url, init } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias\/i1$/)
    expect(init.method).toBe('DELETE')
    expect(invalidar).toHaveBeenCalledWith({ queryKey: INSIGNIAS_QUERY_KEY })
  })

  it('useReordenarInsignias hace PATCH /admin/insignias/reordenar con { ids }', async () => {
    fetchMock.mockReturnValue(respuestaJson({}))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useReordenarInsignias(), { wrapper })

    await act(() => result.current.mutateAsync(['b', 'a']))

    const { url, init, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias\/reordenar$/)
    expect(init.method).toBe('PATCH')
    expect(body).toEqual({ ids: ['b', 'a'] })
  })

  it('useImportarInsignia hace POST /importar con { entrada } y devuelve la vista previa', async () => {
    const vista = { proveedor: 'credly', nombre: 'AWS', avisos: [] }
    fetchMock.mockReturnValue(respuestaJson(vista))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useImportarInsignia(), { wrapper })

    const respuesta = await act(() => result.current.mutateAsync('https://www.credly.com/badges/abc'))

    const { url, body } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias\/importar$/)
    expect(body).toEqual({ entrada: 'https://www.credly.com/badges/abc' })
    expect(respuesta).toEqual(vista)
  })

  it('useImportarArchivoInsignia sube multipart con el campo `file`', async () => {
    fetchMock.mockReturnValue(respuestaJson({ proveedor: 'open_badges', imagen_media_id: 'm1', avisos: [] }))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useImportarArchivoInsignia(), { wrapper })
    const archivo = new File(['x'], 'insignia.png', { type: 'image/png' })

    await act(() => result.current.mutateAsync(archivo))

    const { url, init } = ultimaLlamada()
    expect(url).toMatch(/\/admin\/insignias\/importar-archivo$/)
    expect(init.method).toBe('POST')
    expect((init.body as FormData).get('file')).toBe(archivo)
  })

  it('propaga el mensaje de error del API', async () => {
    fetchMock.mockReturnValue(respuestaJson({ message: 'Entrada inválida' }, false, 400))
    const { wrapper } = crearWrapper()
    const { result } = renderHook(() => useImportarInsignia(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('x').catch(() => undefined)
    })

    await waitFor(() => expect(result.current.error?.message).toBe('Entrada inválida'))
  })
})
