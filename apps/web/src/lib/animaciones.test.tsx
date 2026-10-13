import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ProveedorModoRenderizado } from '@/components/publico/contexto-renderizado'
import { simularMovimientoReducido } from '@/test/movimiento'
import {
  VARIANTES_ENTRADA,
  VIEWPORT_ENTRADA,
  VIEWPORT_ITEM,
  escalonado,
  useAnimacionesActivas,
  usePrefiereMovimientoReducido,
} from './animaciones'

const enModo = (modo: 'publico' | 'editor') =>
  function Envoltura({ children }: { children: ReactNode }) {
    return <ProveedorModoRenderizado modo={modo}>{children}</ProveedorModoRenderizado>
  }

/**
 * Fase 7 (7.3, UC-12): las animaciones de entrada se apagan con
 * `prefers-reduced-motion` y dentro del lienzo de Puck (`modoRenderizado ===
 * 'editor'`); el resto del tiempo están activas.
 */
describe('useAnimacionesActivas (Fase 7)', () => {
  it('está activa en el sitio público sin movimiento reducido', () => {
    simularMovimientoReducido(false)
    const { result } = renderHook(() => useAnimacionesActivas(), { wrapper: enModo('publico') })
    expect(result.current).toBe(true)
  })

  it('se desactiva con prefers-reduced-motion', () => {
    simularMovimientoReducido(true)
    const { result } = renderHook(() => useAnimacionesActivas(), { wrapper: enModo('publico') })
    expect(result.current).toBe(false)
  })

  it('se desactiva en el lienzo del editor aunque no haya movimiento reducido', () => {
    simularMovimientoReducido(false)
    const { result } = renderHook(() => useAnimacionesActivas(), { wrapper: enModo('editor') })
    expect(result.current).toBe(false)
  })

  it('usePrefiereMovimientoReducido refleja la consulta del sistema', () => {
    simularMovimientoReducido(true)
    const { result } = renderHook(() => usePrefiereMovimientoReducido())
    expect(result.current).toBe(true)
  })
})

describe('VARIANTES_ENTRADA y escalonado (Fase 7)', () => {
  it('tiene una variante por cada animación salvo "ninguna"', () => {
    expect(Object.keys(VARIANTES_ENTRADA).sort()).toEqual([
      'aparecer',
      'deslizar_arriba',
      'deslizar_lateral',
      'escalar',
    ])
  })

  it('todas arrancan transparentes y terminan opacas', () => {
    for (const variante of Object.values(VARIANTES_ENTRADA)) {
      expect(variante.initial.opacity).toBe(0)
      expect(variante.whileInView.opacity).toBe(1)
    }
  })

  it('escalonado crece por índice y tiene tope', () => {
    expect(escalonado(0)).toBe(0)
    expect(escalonado(2)).toBeCloseTo(0.16)
    expect(escalonado(50)).toBe(escalonado(8))
  })
})

describe('VIEWPORT_ENTRADA (Fase 7, UC-12)', () => {
  it('no exige un ratio alto: una sección más alta que el viewport debe revelarse', () => {
    const { amount } = VIEWPORT_ENTRADA
    expect(amount === 'some' || (typeof amount === 'number' && amount <= 0.1)).toBe(true)
  })

  it('los ítems pequeños sí pueden usar un umbral mayor', () => {
    expect(VIEWPORT_ITEM.amount).toBeGreaterThan(0.1)
  })
})
