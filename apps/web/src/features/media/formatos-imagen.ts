/**
 * Fase 7g, UC-09 y UC-35: única fuente de los formatos que admite el panel.
 * El navegador no siempre informa `file.type` (en Windows sin las extensiones
 * HEIF un `.heic` llega vacío), así que el formato real se decide por los
 * primeros bytes, luego por extensión y solo al final por `file.type`.
 */

const HEIC = '.heic,.heif,image/heic,image/heif'

/** `accept` para campos que solo admiten imágenes (incluye HEIC/HEIF). */
export const ACCEPT_IMAGENES = `image/*,${HEIC}`
/** `accept` de la biblioteca: imágenes y PDF. */
export const ACCEPT_IMAGENES_Y_PDF = `${ACCEPT_IMAGENES},application/pdf`
/** `accept` de la importación de insignias desde archivo. */
export const ACCEPT_INSIGNIAS = `image/png,image/jpeg,image/webp,image/svg+xml,${HEIC},application/pdf`

export const FORMATOS_ADMITIDOS_TEXTO = 'JPG, PNG, WebP, AVIF, GIF, SVG, HEIC y PDF'

/** Mensaje de rechazo del cliente por formato no admitido. */
export const MENSAJE_FORMATO_NO_ADMITIDO = `Formato no admitido. Usa ${FORMATOS_ADMITIDOS_TEXTO} (hasta 10 MB).`

export type FormatoArchivo = 'heic' | 'imagen' | 'pdf' | 'desconocido'

const MARCAS_HEIC = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'])
const MARCAS_AVIF = new Set(['avif', 'avis'])

function ascii(bytes: Uint8Array, desde: number, hasta: number): string {
  let texto = ''
  for (let i = desde; i < Math.min(hasta, bytes.length); i++) {
    texto += String.fromCharCode(bytes[i])
  }
  return texto
}

function empiezaCon(bytes: Uint8Array, firma: number[]): boolean {
  return firma.every((valor, i) => bytes[i] === valor)
}

/** Lee la caja `ftyp` (marca mayor y compatibles) de un contenedor ISO-BMFF. */
function formatoPorCajaFtyp(bytes: Uint8Array): FormatoArchivo | null {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== 'ftyp') return null
  const marcas = [ascii(bytes, 8, 12)]
  // La caja mide `tamaño` bytes (con tope 64, lo leído): sin acotarla se leería basura
  // posterior. Bytes 12-15: versión menor; desde el 16, marcas compatibles de 4 en 4.
  const tamano = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0)
  const fin = Math.min(tamano, 64, bytes.length)
  for (let i = 16; i + 4 <= fin; i += 4) marcas.push(ascii(bytes, i, i + 4))
  if (marcas.some((marca) => MARCAS_AVIF.has(marca))) return 'imagen'
  if (marcas.some((marca) => MARCAS_HEIC.has(marca))) return 'heic'
  return null
}

function formatoPorFirma(bytes: Uint8Array): FormatoArchivo | null {
  const ftyp = formatoPorCajaFtyp(bytes)
  if (ftyp) return ftyp
  if (empiezaCon(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'imagen'
  if (empiezaCon(bytes, [0xff, 0xd8, 0xff])) return 'imagen'
  if (ascii(bytes, 0, 4) === 'GIF8') return 'imagen'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'imagen'
  if (ascii(bytes, 0, 4) === '%PDF') return 'pdf'
  // SVG: texto que, tras BOM y espacios, empieza por `<svg` o por el prólogo XML.
  const texto = ascii(bytes, 0, bytes.length)
    .replace(/^(ï»¿|\s)+/, '')
    .toLowerCase()
  if (texto.startsWith('<svg') || texto.startsWith('<?xml')) return 'imagen'
  return null
}

function formatoPorExtension(nombre: string): FormatoArchivo | null {
  const extension = nombre.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (!extension) return null
  if (['heic', 'heif', 'hif'].includes(extension)) return 'heic'
  if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'].includes(extension)) return 'imagen'
  if (extension === 'pdf') return 'pdf'
  return null
}

function formatoPorMime(tipo: string): FormatoArchivo | null {
  if (tipo === 'image/heic' || tipo === 'image/heif') return 'heic'
  if (tipo.startsWith('image/')) return 'imagen'
  if (tipo === 'application/pdf') return 'pdf'
  return null
}

/** Decide el formato real de un archivo: bytes, luego extensión, luego `file.type`. */
export async function detectarFormatoArchivo(file: File): Promise<FormatoArchivo> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer())
    const porFirma = formatoPorFirma(bytes)
    if (porFirma) return porFirma
  } catch {
    // Sin lectura de bytes se sigue con extensión y tipo declarado.
  }
  return formatoPorExtension(file.name) ?? formatoPorMime(file.type) ?? 'desconocido'
}
