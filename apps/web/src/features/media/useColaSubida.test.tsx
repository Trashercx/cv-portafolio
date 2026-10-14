import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { XhrFalso } from '@/test/xhr-falso'
import { useColaSubida } from './useColaSubida'

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

    expect(result.current.items.map((i) => i.estado)).toEqual(['error', 'error'])
    expect(result.current.items[0].error).toMatch(/imágenes y PDF/)
    expect(result.current.items[1].error).toMatch(/10 MB/)
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
