import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCierreConCambios } from './useCierreConCambios'

/** Fase 7m (#68): contrato común del cierre de los `*FormDialog`. */
describe('useCierreConCambios', () => {
  it('sin cambios cierra directo y no pide confirmación', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useCierreConCambios(false, onOpenChange))

    act(() => result.current.intentarCerrar(false))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(result.current.abiertoConfirmacion).toBe(false)
  })

  it('con cambios no cierra: abre la confirmación', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useCierreConCambios(true, onOpenChange))

    act(() => result.current.intentarCerrar(false))

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(result.current.abiertoConfirmacion).toBe(true)
  })

  it('abrir nunca pide confirmación aunque haya cambios', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useCierreConCambios(true, onOpenChange))

    act(() => result.current.intentarCerrar(true))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(result.current.abiertoConfirmacion).toBe(false)
  })

  it('cancelar sigue editando; confirmarDescartar cierra y oculta la confirmación', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useCierreConCambios(true, onOpenChange))

    act(() => result.current.intentarCerrar(false))
    act(() => result.current.cancelar())
    expect(result.current.abiertoConfirmacion).toBe(false)
    expect(onOpenChange).not.toHaveBeenCalled()

    act(() => result.current.intentarCerrar(false))
    act(() => result.current.confirmarDescartar())
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(result.current.abiertoConfirmacion).toBe(false)
  })
})
