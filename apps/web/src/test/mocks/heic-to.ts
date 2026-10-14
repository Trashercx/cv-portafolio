import { vi } from 'vitest'

/**
 * Doble de `heic-to` para jsdom (Fase 7g, UC-09): libheif en WebAssembly no
 * corre en los tests. Devuelve un blob JPEG mínimo; los tests pueden cambiar
 * el comportamiento con `vi.mocked(heicTo)`.
 */
export const heicTo = vi.fn(async () => new Blob(['jpeg-simulado'], { type: 'image/jpeg' }))
export const isHeic = vi.fn(async () => true)
