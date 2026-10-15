import { randomBytes } from 'crypto';
import { extname } from 'path';

/**
 * Fase 7h (UC-09): la clave de S3 conserva el nombre con el que el usuario
 * subió el archivo. Antes era `<carpeta>/<uuid>.<ext>` y la biblioteca, que
 * muestra el último segmento de `s3_key`, enseñaba un nombre aleatorio.
 * Ahora es `<carpeta>/<id corto>/<nombre-saneado>.<ext>`: el segmento
 * intermedio (12 hex) garantiza unicidad sin ensuciar el nombre, y la URL
 * pública termina en el nombre real del archivo.
 */

/** Extensión canónica por MIME real (ya normalizado por contenido). */
const EXTENSION_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

const LARGO_MAXIMO_BASE = 80;

/**
 * Multer (busboy) decodifica el `filename` del multipart como latin1, así que
 * "Certificación.pdf" llega como "CertificaciÃ³n.pdf". Si al reinterpretarlo
 * como UTF-8 sale un texto válido, se usa ese; si no, se deja tal cual.
 */
export function repararNombreOriginal(nombre: string): string {
  if (!/[\u0080-\u00ff]/.test(nombre)) return nombre;
  // Ya trae caracteres fuera de latin1: no es un UTF-8 mal decodificado.
  if (/[^\u0000-\u00ff]/.test(nombre)) return nombre;
  const reparado = Buffer.from(nombre, 'latin1').toString('utf8');
  return reparado.includes('\uFFFD') ? nombre : reparado;
}

/**
 * Nombre de archivo apto para una clave de S3 y una URL sin codificar:
 * sin tildes, con `-` en lugar de espacios y símbolos, conservando
 * mayúsculas, y con la extensión del MIME real (un HEIC convertido en el
 * navegador ya llega como `.jpg`).
 */
export function nombreArchivoSeguro(
  nombreOriginal: string,
  mimetype: string,
): string {
  const nombre = repararNombreOriginal(nombreOriginal ?? '');
  const extensionOriginal = extname(nombre);
  const base = nombre
    .slice(0, nombre.length - extensionOriginal.length)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .slice(0, LARGO_MAXIMO_BASE)
    .replace(/[-._]+$/g, '');

  const extension =
    EXTENSION_POR_MIME[mimetype] ??
    extensionOriginal
      .slice(1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);

  const baseFinal = base || 'archivo';
  return extension ? `${baseFinal}.${extension}` : baseFinal;
}

/** `<prefijo>/<id corto>/<nombre>` (sin prefijo si no se indica). */
export function construirClaveMedia(
  prefijo: string | undefined,
  nombreOriginal: string,
  mimetype: string,
): string {
  const id = randomBytes(6).toString('hex');
  const nombre = nombreArchivoSeguro(nombreOriginal, mimetype);
  return prefijo ? `${prefijo}/${id}/${nombre}` : `${id}/${nombre}`;
}

/**
 * Cabecera `Content-Disposition` para que al descargar el archivo el
 * navegador proponga el nombre original (RFC 6266 / 5987).
 */
export function contentDispositionInline(nombre: string): string {
  const ascii = nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}
