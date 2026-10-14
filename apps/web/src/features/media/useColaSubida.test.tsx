import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { XhrFalso } from '@/test/xhr-falso'
import { prepararArchivoParaSubir } from './heic-a-jpeg'
import { useColaSubida } from './useColaSubida'

// Fase 7g: en jsdom no hay decodificación real; por defecto se usa la preparación real
// (los no HEIC pasan tal cual) y los tests de HEIC la sustituyen con `mockImplementationOnce`.
vi.mock('./heic-a-jpeg', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('./heic-a-jpeg')>()
  return { ...real, prepararArchivoParaSubir: vi.fn(real.prepararArchivoParaSubir) }
})

const archivo = (nombre: string, tipo = 'image/png') =>
  new File(['x'], nombre, { type: tipo })

function montar() {
  const queryClient = new QueryClient()
  const invalidar = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useColaSubida(3), { wrapper }), invalidar }
}

describe('useColaSubida (Fase 7d, UC-09)', () => {
  const original = globalThis.XMLHttpRequest

  beforeEach(() => XhrFalso.instalar())
  afterEach(() => {
    ;(globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = original
  })

  it('sube como máximo 3 en paralelo y arranca el siguiente al liberarse un cupo', async () => {
    const { result } = montar()
    act(() => result.current.agregar([1, 2, 3, 4, 5].map((n) => archivo(`a${n}.png`))))

    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(3))
    expect(result.current.items.map((i) => i.estado)).toEqual([
      'subiendo',
      'subiendo',
      'subiendo',
      'pendiente',
      'pendiente',
    ])

    act(() => XhrFalso.instancias[0].responder(201, { id: 'm1' }))

    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(4))
    expect(result.current.items[0].estado).toBe('listo')
    expect(result.current.items[4].estado).toBe('pendiente')
  })

  it('refleja el progreso por archivo y invalida la biblioteca al terminar cada uno', async () => {
    const { result, invalidar } = montar()
    act(() => result.current.agregar([archivo('a.png')]))
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(1))

    act(() => XhrFalso.instancias[0].progreso(40, 100))
    expect(result.current.items[0].progreso).toBe(40)

    act(() => XhrFalso.instancias[0].responder(201, { id: 'm1' }))
    await waitFor(() => expect(result.current.items[0].estado).toBe('listo'))
    expect(result.current.items[0].progreso).toBe(100)
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['media'] })
  })

  it('marca error con el mensaje del servidor y permite reintentar', async () => {
    const { result } = montar()
    act(() => result.current.agregar([archivo('a.png')]))
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(1))

    act(() => XhrFalso.instancias[0].responder(400, { message: 'Formato no válido' }))
    await waitFor(() => expect(result.current.items[0].estado).toBe('error'))
    expect(result.current.items[0].error).toBe('Formato no válido')

    act(() => result.current.reintentar(result.current.items[0].id))
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(2))
    act(() => XhrFalso.instancias[1].responder(201, { id: 'm1' }))
    await waitFor(() => expect(result.current.items[0].estado).toBe('listo'))
  })

  it('cancela una subida en curso y una pendiente', async () => {
    const { result } = montar()
    act(() => result.current.agregar([1, 2, 3, 4].map((n) => archivo(`a${n}.png`))))
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(3))

    act(() => result.current.cancelar(result.current.items[0].id))
    expect(XhrFalso.instancias[0].abortado).toBe(true)
    await waitFor(() => expect(result.current.items[0].estado).toBe('cancelado'))

    // El cupo liberado lo toma el cuarto; cancelar uno aún no iniciado no abre XHR.
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(4))
  })

  it('rechaza en cliente tipos no admitidos y archivos de más de 10 MB sin abrir XHR', async () => {
    const { result } = montar()
    const grande = new File(['x'], 'grande.png', { type: 'image/png' })
    Object.defineProperty(grande, 'size', { value: 11 * 1024 * 1024 })
    act(() => result.current.agregar([archivo('a.zip', 'application/zip'), grande]))

    await waitFor(() =>
      expect(result.current.items.map((i) => i.estado)).toEqual(['error', 'error']),
    )
    expect(result.current.items[0].error).toMatch(/JPG, PNG, WebP, AVIF, GIF, SVG, HEIC y PDF/)
    expect(result.current.items[1].error).toMatch(/10 MB/)
    expect(XhrFalso.instancias).toHaveLength(0)
  })

  const cabeceraHeic = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99])
  const jpeg = () => new File(['jpg'], 'IMG_1.jpg', { type: 'image/jpeg' })

  it('un HEIC con type vacío pasa convirtiendo → pendiente → subiendo con el JPEG', async () => {
    let terminar: (f: File) => void = () => {}
    vi.mocked(prepararArchivoParaSubir).mockImplementationOnce(
      () => new Promise((resolver) => (terminar = (file) => resolver({ file, formato: 'imagen' }))),
    )
    const { result } = montar()
    const heic = new File([cabeceraHeic], 'IMG_1.HEIC', { type: '' })
    act(() => result.current.agregar([heic]))

    expect(result.current.items[0].estado).toBe('convirtiendo')
    expect(XhrFalso.instancias).toHaveLength(0)
    await waitFor(() => expect(prepararArchivoParaSubir).toHaveBeenCalledWith(heic))

    act(() => terminar(jpeg()))

    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(1))
    expect(result.current.items[0].file.name).toBe('IMG_1.jpg')
    expect(result.current.items[0].normalizado).toBe(true)
    expect(result.current.items[0].estado).toBe('subiendo')
  })

  it('un fallo de conversión deja el item en error con el mensaje', async () => {
    vi.mocked(prepararArchivoParaSubir).mockResolvedValueOnce({ error: 'No se pudo convertir la foto HEIC.' })
    const { result } = montar()
    act(() => result.current.agregar([new File(['x'], 'a.heic', { type: '' })]))

    await waitFor(() => expect(result.current.items[0].estado).toBe('error'))
    expect(result.current.items[0].error).toMatch(/No se pudo convertir/)
    expect(XhrFalso.instancias).toHaveLength(0)
  })

  it('reintentar tras un fallo de conversión vuelve a convertir y sube el JPEG', async () => {
    vi.mocked(prepararArchivoParaSubir).mockResolvedValueOnce({ error: 'No se pudo convertir la foto HEIC.' })
    const { result } = montar()
    const heic = new File([cabeceraHeic], 'IMG_1.HEIC', { type: '' })
    act(() => result.current.agregar([heic]))
    await waitFor(() => expect(result.current.items[0].estado).toBe('error'))

    vi.mocked(prepararArchivoParaSubir).mockResolvedValueOnce({ file: jpeg(), formato: 'imagen' })
    act(() => result.current.reintentar(result.current.items[0].id))

    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(1))
    expect(prepararArchivoParaSubir).toHaveBeenLastCalledWith(heic)
    expect(result.current.items[0].file.name).toBe('IMG_1.jpg')
  })

  it('cancelar durante convirtiendo deja el item cancelado aunque la conversión termine después', async () => {
    let terminar: (f: File) => void = () => {}
    vi.mocked(prepararArchivoParaSubir).mockImplementationOnce(
      () => new Promise((resolver) => (terminar = (file) => resolver({ file, formato: 'imagen' }))),
    )
    const { result } = montar()
    act(() => result.current.agregar([new File([cabeceraHeic], 'IMG_1.HEIC', { type: '' })]))
    await waitFor(() => expect(prepararArchivoParaSubir).toHaveBeenCalled())

    act(() => result.current.cancelar(result.current.items[0].id))
    expect(result.current.items[0].estado).toBe('cancelado')

    await act(async () => terminar(jpeg()))
    expect(result.current.items[0].estado).toBe('cancelado')
    expect(XhrFalso.instancias).toHaveLength(0)
  })

  it('limpia los terminados y conserva los activos', async () => {
    const { result } = montar()
    act(() => result.current.agregar([archivo('a.png'), archivo('b.png')]))
    await waitFor(() => expect(XhrFalso.instancias).toHaveLength(2))
    act(() => XhrFalso.instancias[0].responder(201, { id: 'm1' }))
    await waitFor(() => expect(result.current.items[0].estado).toBe('listo'))

    act(() => result.current.limpiar())
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].file.name).toBe('b.png')
  })
})
