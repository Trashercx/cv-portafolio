import { describe, expect, it } from 'vitest'
import { formatearBytes } from './formato'

describe('formatearBytes (Fase 7m)', () => {
  it('formatea en B, KB, MB y GB con coma decimal', () => {
    expect(formatearBytes(0)).toBe('0 B')
    expect(formatearBytes(512)).toBe('512 B')
    expect(formatearBytes(860160)).toBe('840 KB')
    expect(formatearBytes(1258291)).toBe('1,2 MB')
    expect(formatearBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatearBytes(1.5 * 1024 * 1024 * 1024)).toBe('1,5 GB')
  })

  it('sin dato válido devuelve null para que el llamador lo omita', () => {
    expect(formatearBytes(null)).toBeNull()
    expect(formatearBytes(undefined)).toBeNull()
    expect(formatearBytes(-1)).toBeNull()
    expect(formatearBytes(Number.NaN)).toBeNull()
  })
})
