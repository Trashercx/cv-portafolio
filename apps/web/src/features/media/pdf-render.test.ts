import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderizarPrimeraPagina } from './pdf-render'

/** Fase 7m (#66, #68): render de la primera página con `pdfjs-dist` mockeado. */

const render = vi.fn(() => ({ promise: Promise.resolve() }))
const getViewport = vi.fn(({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }))
const destroy = vi.fn(async () => {})
const getDocument = vi.fn((_fuente: unknown) => ({
  promise: Promise.resolve({ getPage: async () => ({ getViewport, render }), destroy }),
}))

vi.mock('pdfjs-dist', () => ({
  getDocument: (fuente: unknown) => getDocument(fuente),
  GlobalWorkerOptions: { workerSrc: '' },
}))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.min.js' }))

describe('renderizarPrimeraPagina (Fase 7m)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    )
  })

  it('descarga el PDF por URL sin eval y acota el lado mayor', async () => {
    const blob = await renderizarPrimeraPagina('https://cdn.example.com/a.pdf', { ladoMaximo: 400 })

    expect(getDocument).toHaveBeenCalledWith({ url: 'https://cdn.example.com/a.pdf', isEvalSupported: false })
    expect(blob.type).toBe('image/png')
    // El lado mayor (alto, 842) se escala a 400.
    const { scale } = getViewport.mock.calls.at(-1)![0]
    expect(842 * scale).toBeCloseTo(400)
    expect(destroy).toHaveBeenCalled()
  })

  it('acepta un File local', async () => {
    const archivo = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })
    archivo.arrayBuffer = async () => new ArrayBuffer(4)
    await renderizarPrimeraPagina(archivo)
    expect(getDocument).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer), isEvalSupported: false })
  })

  it('libera el documento aunque el render falle', async () => {
    render.mockReturnValueOnce({ promise: Promise.reject(new Error('boom')) })
    await expect(renderizarPrimeraPagina('https://cdn.example.com/a.pdf')).rejects.toThrow('boom')
    expect(destroy).toHaveBeenCalled()
  })
})
