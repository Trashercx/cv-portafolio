import { heicTo } from 'heic-to/csp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_ERROR_HEIC, normalizarImagenParaSubir, prepararArchivoParaSubir } from './heic-a-jpeg'

const cabeceraHeic: Array<string | number[]> = [[0, 0, 0, 24], 'ftyp', 'heic', [0, 0, 0, 0], 'mif1heic']
function archivoHeic(nombre = 'IMG_1234.HEIC'): File {
  const bytes = cabeceraHeic.flatMap((p) =>
    typeof p === 'string' ? Array.from(p).map((c) => c.charCodeAt(0)) : p,
  )
  return new File([new Uint8Array(bytes)], nombre, { type: '', lastModified: 1_700_000_000_000 })
}

describe('normalizarImagenParaSubir (Fase 7g, UC-09)', () => {
  let canvasPintado: { width: number; height: number } | null
  let calidades: unknown[]
  let tamanoJpeg: number

  beforeEach(() => {
    canvasPintado = null
    calidades = []
    tamanoJpeg = 10
    vi.mocked(heicTo).mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => ({ drawImage: vi.fn() })) as unknown as HTMLCanvasElement['getContext'],
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      _tipo?: string,
      calidad?: unknown,
    ) {
      canvasPintado = { width: this.width, height: this.height }
      calidades.push(calidad)
      callback(new Blob([new Uint8Array(tamanoJpeg)], { type: 'image/jpeg' }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('devuelve el mismo File si no es HEIC', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png', { type: 'image/png' })
    expect(await normalizarImagenParaSubir(png)).toBe(png)
  })

  it('camino nativo: createImageBitmap + canvas acotado, JPEG calidad 0,9', async () => {
    const cerrar = vi.fn()
    const crear = vi.fn().mockResolvedValue({ width: 8000, height: 6000, close: cerrar })
    vi.stubGlobal('createImageBitmap', crear)

    const original = archivoHeic()
    const resultado = await normalizarImagenParaSubir(original)

    expect(crear).toHaveBeenCalledWith(original, { imageOrientation: 'from-image' })
    expect(heicTo).not.toHaveBeenCalled()
    expect(resultado.name).toBe('IMG_1234.jpg')
    expect(resultado.type).toBe('image/jpeg')
    expect(resultado.lastModified).toBe(original.lastModified)
    expect(calidades).toEqual([0.9])
    // 8000x6000 = 48 MP: se reduce a <= 4000 px de lado y <= 16 MP.
    expect(Math.max(canvasPintado!.width, canvasPintado!.height)).toBeLessThanOrEqual(4000)
    expect(canvasPintado!.width * canvasPintado!.height).toBeLessThanOrEqual(16_000_000)
    expect(cerrar).toHaveBeenCalled()
  })

  it('camino heic-to cuando createImageBitmap falla', async () => {
    const crear = vi
      .fn()
      .mockRejectedValueOnce(new Error('no soportado'))
      .mockResolvedValueOnce({ width: 1000, height: 800, close: vi.fn() })
    vi.stubGlobal('createImageBitmap', crear)

    const resultado = await normalizarImagenParaSubir(archivoHeic('foto.heic'))

    expect(heicTo).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/jpeg', quality: 0.9 }))
    expect(resultado.name).toBe('foto.jpg')
    expect(resultado.type).toBe('image/jpeg')
  })

  it('reintenta a calidad 0,8 y lado 3000 si el JPEG pasa de 10 MB', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }),
    )
    tamanoJpeg = 11 * 1024 * 1024
    await normalizarImagenParaSubir(archivoHeic())
    expect(calidades).toEqual([0.9, 0.8])
    expect(canvasPintado!.width).toBeLessThanOrEqual(3000)
  })

  it('lanza el mensaje de conversión si todos los caminos fallan', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no')))
    vi.mocked(heicTo).mockRejectedValueOnce(new Error('wasm'))
    await expect(normalizarImagenParaSubir(archivoHeic())).rejects.toThrow(MENSAJE_ERROR_HEIC)
  })

  it('sin createImageBitmap decodifica el JPEG de heic-to con un <img> y revoca la object URL', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    vi.stubGlobal(
      'Image',
      class {
        width = 1000
        height = 800
        src = ''
        decode = () => Promise.resolve()
      },
    )
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:intermedio')
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const resultado = await normalizarImagenParaSubir(archivoHeic('foto.heic'))

    expect(resultado.type).toBe('image/jpeg')
    expect(crear).toHaveBeenCalledTimes(1)
    expect(revocar).toHaveBeenCalledWith('blob:intermedio')
  })
})

describe('prepararArchivoParaSubir (Fase 7g, criterio único de tamaño)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => ({ drawImage: vi.fn() })) as unknown as HTMLCanvasElement['getContext'],
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const conTamano = (file: File, bytes: number) => {
    Object.defineProperty(file, 'size', { value: bytes })
    return file
  }

  it('mide el original solo si no es HEIC', async () => {
    const png = conTamano(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png'), 11 * 1024 * 1024)
    expect(await prepararArchivoParaSubir(png)).toEqual({ error: 'El archivo supera los 10 MB.' })
  })

  it('un HEIC grande se convierte primero y se admite si el JPEG cabe', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }))
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['j'])))
    const heic = conTamano(archivoHeic(), 15 * 1024 * 1024)
    const resultado = await prepararArchivoParaSubir(heic)
    expect('file' in resultado && resultado.file.name).toBe('IMG_1234.jpg')
  })

  it('si el JPEG convertido sigue superando 10 MB, error específico', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }))
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) =>
      cb(new Blob([new Uint8Array(11 * 1024 * 1024)])),
    )
    expect(await prepararArchivoParaSubir(archivoHeic())).toEqual({
      error: 'La foto supera los 10 MB.',
    })
  })

  it('formato desconocido y fallo de conversión devuelven error', async () => {
    const zip = new File(['PK'], 'a.zip', { type: 'application/zip' })
    expect(await prepararArchivoParaSubir(zip)).toEqual({ error: expect.stringContaining('HEIC y PDF') })
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no')))
    vi.mocked(heicTo).mockRejectedValueOnce(new Error('wasm'))
    expect(await prepararArchivoParaSubir(archivoHeic())).toEqual({ error: MENSAJE_ERROR_HEIC })
  })
})
