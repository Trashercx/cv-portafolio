import { describe, expect, it } from 'vitest'
import {
  ACCEPT_IMAGENES,
  ACCEPT_IMAGENES_Y_PDF,
  ACCEPT_INSIGNIAS,
  detectarFormatoArchivo,
  FORMATOS_ADMITIDOS_TEXTO,
} from './formatos-imagen'

/** Arma un archivo con los bytes dados (cada elemento: texto ASCII o lista de bytes). */
function archivo(partes: Array<string | number[]>, nombre: string, type = ''): File {
  const bytes = partes.flatMap((p) =>
    typeof p === 'string' ? Array.from(p).map((c) => c.charCodeAt(0)) : p,
  )
  return new File([new Uint8Array(bytes)], nombre, { type })
}

const ftyp = (marca: string, compatibles = '') =>
  archivo([[0, 0, 0, 24], 'ftyp', marca, [0, 0, 0, 0], compatibles], 'x.bin')

describe('detectarFormatoArchivo (Fase 7g, UC-09)', () => {
  it('detecta HEIC por la caja ftyp aunque el type venga vacío', async () => {
    const heic = archivo([[0, 0, 0, 24], 'ftyp', 'heic', [0, 0, 0, 0], 'mif1heic'], 'IMG_0001.HEIC')
    expect(heic.type).toBe('')
    expect(await detectarFormatoArchivo(heic)).toBe('heic')
  })

  it.each(['heix', 'hevc', 'hevx', 'mif1', 'msf1'])('marca mayor %s es HEIC', async (marca) => {
    expect(await detectarFormatoArchivo(ftyp(marca))).toBe('heic')
  })

  it('detecta HEIC por una marca compatible', async () => {
    expect(await detectarFormatoArchivo(ftyp('isom', 'heic'))).toBe('heic')
  })

  it('acota las marcas compatibles al tamaño de la caja ftyp (la basura posterior no cuenta)', async () => {
    // Caja de 16 bytes (sin marcas compatibles) seguida de bytes que parecen la marca `heic`.
    const corta = archivo([[0, 0, 0, 16], 'ftyp', 'isom', [0, 0, 0, 0], 'heicheic'], 'x.bin')
    expect(await detectarFormatoArchivo(corta)).toBe('desconocido')
  })

  it('una marca compatible avif gana a mif1 como marca mayor', async () => {
    expect(await detectarFormatoArchivo(ftyp('mif1', 'avif'))).toBe('imagen')
  })

  it('AVIF es una imagen normal, no HEIC', async () => {
    expect(await detectarFormatoArchivo(ftyp('avif', 'mif1'))).toBe('imagen')
    expect(await detectarFormatoArchivo(ftyp('avis'))).toBe('imagen')
  })

  it('detecta PNG, JPEG, GIF y WebP por firma, ignorando extensión y type', async () => {
    expect(await detectarFormatoArchivo(archivo([[0x89, 0x50, 0x4e, 0x47, 13, 10]], 'a.dat'))).toBe('imagen')
    expect(await detectarFormatoArchivo(archivo([[0xff, 0xd8, 0xff, 0xe0]], 'a.dat'))).toBe('imagen')
    expect(await detectarFormatoArchivo(archivo(['GIF89a'], 'a.dat'))).toBe('imagen')
    expect(await detectarFormatoArchivo(archivo(['RIFF', [1, 2, 3, 4], 'WEBPVP8 '], 'a.dat'))).toBe('imagen')
  })

  it('detecta PDF por firma', async () => {
    expect(await detectarFormatoArchivo(archivo(['%PDF-1.7'], 'certificado.dat'))).toBe('pdf')
  })

  it('detecta SVG con BOM, espacios o prólogo XML', async () => {
    expect(
      await detectarFormatoArchivo(archivo([[0xef, 0xbb, 0xbf], '  <svg xmlns="x"></svg>'], 'a.dat')),
    ).toBe('imagen')
    expect(await detectarFormatoArchivo(archivo(['<?xml version="1.0"?><svg/>'], 'a.dat'))).toBe('imagen')
  })

  it('un .heic sin bytes reconocibles se decide por extensión', async () => {
    expect(await detectarFormatoArchivo(archivo(['nada'], 'foto.heic'))).toBe('heic')
    expect(await detectarFormatoArchivo(archivo(['nada'], 'foto.HEIF'))).toBe('heic')
    expect(await detectarFormatoArchivo(archivo(['nada'], 'foto.hif'))).toBe('heic')
    expect(await detectarFormatoArchivo(archivo(['nada'], 'foto.jpg'))).toBe('imagen')
    expect(await detectarFormatoArchivo(archivo(['nada'], 'doc.pdf'))).toBe('pdf')
  })

  it('usa file.type solo como último recurso', async () => {
    expect(await detectarFormatoArchivo(archivo(['nada'], 'sin-extension', 'image/png'))).toBe('imagen')
    expect(await detectarFormatoArchivo(archivo(['nada'], 'sin-extension', 'application/pdf'))).toBe('pdf')
  })

  it('devuelve desconocido para otros formatos', async () => {
    expect(await detectarFormatoArchivo(archivo(['PK'], 'datos.zip', 'application/zip'))).toBe('desconocido')
    expect(await detectarFormatoArchivo(archivo(['II*'], 'scan.tiff'))).toBe('desconocido')
  })
})

describe('constantes de formatos (Fase 7g)', () => {
  it('los accept incluyen HEIC y el texto enumera los formatos', () => {
    expect(ACCEPT_IMAGENES).toContain('.heic')
    expect(ACCEPT_IMAGENES_Y_PDF).toContain('application/pdf')
    expect(ACCEPT_INSIGNIAS).toContain('image/heif')
    expect(FORMATOS_ADMITIDOS_TEXTO).toBe('JPG, PNG, WebP, AVIF, GIF, SVG, HEIC y PDF')
  })
})
