/**
 * Fase 7g, UC-09 y UC-35: convierte fotos HEIC/HEIF a JPEG dentro del
 * navegador, porque el API no decodifica HEVC. Primero el camino nativo
 * (`createImageBitmap`, Safari/iOS); si falla, `heic-to` (libheif en
 * WebAssembly) cargada con `import()` dinámico para que viva en un chunk
 * aparte que solo se descarga al elegir un HEIC, servido desde el propio
 * origen (nunca de un CDN: la CSP no lo permite). Se importa la variante
 * `heic-to/csp`: la principal usa `new Function` y exigiría `'unsafe-eval'`.
 * Ambas arrancan libheif en un worker `blob:`, de ahí `worker-src 'self'
 * blob:` en la CSP de nginx (probado con un HEIC real en Chrome headless:
 * 1440x960 → JPEG en ~1 s).
 */
import {
  detectarFormatoArchivo,
  MENSAJE_FORMATO_NO_ADMITIDO,
  type FormatoArchivo,
} from './formatos-imagen'
import { AREA_MAXIMA_PX, LADO_MAXIMO_PX, MAX_BYTES_SUBIDA } from './limites-lienzo'

export const MENSAJE_ERROR_HEIC =
  // Fase 7h: la conversión es interna; el mensaje no menciona formatos de destino.
  'No se pudo procesar la foto. Vuelve a exportarla desde el teléfono e inténtalo de nuevo.'

type FuenteImagen = CanvasImageSource & { width: number; height: number }

async function bitmapNativo(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') throw new Error('createImageBitmap no disponible')
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

/** Decodifica un blob ya convertido; sin `createImageBitmap` recurre a un `<img>`. */
async function bitmapDeBlob(blob: Blob): Promise<FuenteImagen & { close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob, { imageOrientation: 'from-image' })
  }
  const url = URL.createObjectURL(blob)
  try {
    const imagen = new Image()
    imagen.src = url
    await imagen.decode()
    return imagen
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Pinta la fuente en un canvas acotado por los topes y lo codifica como JPEG. */
async function aJpeg(fuente: FuenteImagen, calidad: number, ladoMaximo: number): Promise<Blob> {
  const { width, height } = fuente
  const escala = Math.min(
    1,
    ladoMaximo / Math.max(width, height),
    Math.sqrt(AREA_MAXIMA_PX / (width * height)),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width * escala))
  canvas.height = Math.max(1, Math.floor(height * escala))
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('Sin contexto 2D')
  contexto.drawImage(fuente, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob sin resultado'))),
      'image/jpeg',
      calidad,
    )
  })
}

async function convertir(file: File): Promise<Blob> {
  let origen: FuenteImagen & { close?: () => void }
  try {
    origen = await bitmapNativo(file)
  } catch {
    // Camino 2: libheif en WebAssembly. Su JPEG pasa de nuevo por el lienzo para aplicar los topes.
    const { heicTo } = await import('heic-to/csp')
    const intermedio = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
    origen = await bitmapDeBlob(intermedio)
  }
  try {
    let jpeg = await aJpeg(origen, 0.9, LADO_MAXIMO_PX)
    if (jpeg.size > MAX_BYTES_SUBIDA) jpeg = await aJpeg(origen, 0.8, 3000)
    return jpeg
  } finally {
    origen.close?.()
  }
}

/**
 * Devuelve el mismo `File` si no es HEIC; si lo es, un JPEG (`<base>.jpg`).
 * Lanza `Error(MENSAJE_ERROR_HEIC)` si ningún camino puede convertirlo.
 */
export async function normalizarImagenParaSubir(file: File): Promise<File> {
  if ((await detectarFormatoArchivo(file)) !== 'heic') return file
  try {
    const blob = await convertir(file)
    const base = file.name.replace(/\.[^./\\]+$/, '') || 'foto'
    return new File([blob], `${base}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    throw new Error(MENSAJE_ERROR_HEIC)
  }
}

export type ArchivoPreparado = { file: File; formato: FormatoArchivo } | { error: string }

/**
 * Criterio único de formato y tamaño para los tres puntos de entrada (cola,
 * `MediaUploadField`, importar insignias). Un HEIC se convierte primero y se
 * mide el JPEG resultante; cualquier otro archivo se mide tal cual.
 */
export async function prepararArchivoParaSubir(file: File): Promise<ArchivoPreparado> {
  const formato = await detectarFormatoArchivo(file)
  if (formato === 'desconocido') return { error: MENSAJE_FORMATO_NO_ADMITIDO }
  if (formato !== 'heic') {
    return file.size > MAX_BYTES_SUBIDA
      ? { error: 'El archivo supera los 10 MB.' }
      : { file, formato }
  }
  try {
    const jpeg = await normalizarImagenParaSubir(file)
    if (jpeg.size > MAX_BYTES_SUBIDA) return { error: 'La foto supera los 10 MB.' }
    return { file: jpeg, formato: 'imagen' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : MENSAJE_ERROR_HEIC }
  }
}
