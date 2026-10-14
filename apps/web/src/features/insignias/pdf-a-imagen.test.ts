import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pdfAImagenPng } from './pdf-a-imagen'

/** Fase 7e, UC-35: PDF → PNG con `pdfjs-dist` mockeado (jsdom no tiene canvas real). */

const render = vi.fn(() => ({ promise: Promise.resolve() }))
const getViewport = vi.fn(({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }))
const destroy = vi.fn(async () => {})
const getDocument = vi.fn(() => ({
  promise: Promise.resolve({ getPage: async () => ({ getViewport, render }), destroy }),
}))
const GlobalWorkerOptions = { workerSrc: '' }

vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => (getDocument as (...a: unknown[]) => unknown)(...args),
  GlobalWorkerOptions,
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.min.js' }))

describe('pdfAImagenPng (Fase 7e)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const contexto = {} as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contexto as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    )
  })

  it('renderiza la primera página con ancho mínimo 1600, worker del bundle y devuelve un PNG', async () => {
    const archivo = new File(['%PDF-1.7'], 'cert.pdf', { type: 'application/pdf' })
    archivo.arrayBuffer = async () => new ArrayBuffer(8)

    const resultado = await pdfAImagenPng(archivo)

    expect(GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.min.js')
    // 595 * 2 = 1190 < 1600: la escala sube hasta alcanzar el ancho mínimo.
    expect(resultado.ancho).toBeGreaterThanOrEqual(1600)
    expect(resultado.alto).toBeGreaterThan(resultado.ancho)
    expect(resultado.blob.type).toBe('image/png')
    expect(render).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalled()
  })

  it('respeta una escala mayor cuando ya da el ancho mínimo', async () => {
    const archivo = new File(['%PDF'], 'cert.pdf', { type: 'application/pdf' })
    archivo.arrayBuffer = async () => new ArrayBuffer(4)

    const resultado = await pdfAImagenPng(archivo, { escala: 4, anchoMinimo: 1000 })

    expect(resultado.ancho).toBe(Math.ceil(595 * 4))
  })

  it('desactiva eval en pdfjs y acota el lienzo de un PDF con MediaBox enorme', async () => {
    getViewport.mockImplementation(({ scale }: { scale: number }) => ({
      width: 20000 * scale,
      height: 15000 * scale,
    }))
    const archivo = new File(['%PDF'], 'enorme.pdf', { type: 'application/pdf' })
    archivo.arrayBuffer = async () => new ArrayBuffer(4)

    const resultado = await pdfAImagenPng(archivo)

    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ isEvalSupported: false }))
    expect(resultado.ancho).toBeLessThanOrEqual(4000)
    expect(resultado.alto).toBeLessThanOrEqual(4000)
    expect(resultado.ancho * resultado.alto).toBeLessThanOrEqual(16_000_000)
    getViewport.mockImplementation(({ scale }: { scale: number }) => ({
      width: 595 * scale,
      height: 842 * scale,
    }))
  })

  it('falla con un mensaje claro si no hay contexto 2D', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const archivo = new File(['%PDF'], 'cert.pdf', { type: 'application/pdf' })
    archivo.arrayBuffer = async () => new ArrayBuffer(4)

    await expect(pdfAImagenPng(archivo)).rejects.toThrow(/lienzo/)
    expect(destroy).toHaveBeenCalled()
  })
})
