import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useConfirmarDescarte } from './useConfirmarDescarte'

describe('useConfirmarDescarte', () => {
  it('cuando isDirty es false, cierra directo sin pedir confirmación', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useConfirmarDescarte(false, alCerrar))

    act(() => {
      result.current.intentarCerrar(false)
    })

    expect(alCerrar).toHaveBeenCalledWith(false)
    expect(result.current.confirmando).toBe(false)
  })

  it('abrir (siguienteAbierto=true) nunca pide confirmación, incluso con isDirty=true', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useConfirmarDescarte(true, alCerrar))

    act(() => {
      result.current.intentarCerrar(true)
    })

    expect(alCerrar).toHaveBeenCalledWith(true)
    expect(result.current.confirmando).toBe(false)
  })

  it('cuando isDirty es true, cerrar no invoca alCerrar de inmediato: activa confirmando', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useConfirmarDescarte(true, alCerrar))

    act(() => {
      result.current.intentarCerrar(false)
    })

    expect(alCerrar).not.toHaveBeenCalled()
    expect(result.current.confirmando).toBe(true)
  })

  it('confirmar() ejecuta el cierre real y oculta la confirmación', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useConfirmarDescarte(true, alCerrar))

    act(() => {
      result.current.intentarCerrar(false)
    })
    act(() => {
      result.current.confirmar()
    })

    expect(alCerrar).toHaveBeenCalledWith(false)
    expect(result.current.confirmando).toBe(false)
  })

  it('cancelar() oculta la confirmación sin cerrar el diálogo de formulario', () => {
    const alCerrar = vi.fn()
    const { result } = renderHook(() => useConfirmarDescarte(true, alCerrar))

    act(() => {
      result.current.intentarCerrar(false)
    })
    act(() => {
      result.current.cancelar()
    })

    expect(alCerrar).not.toHaveBeenCalled()
    expect(result.current.confirmando).toBe(false)
  })
})
