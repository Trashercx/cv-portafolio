import { ProveedorInsignia, VistaPreviaInsignia } from './tipos';

/** Vista previa vacía (los fallos de red nunca son 5xx: solo `avisos`). */
export function vistaVacia(
  proveedor: ProveedorInsignia,
  urlOrigen: string | null,
  avisos: string[] = [],
): VistaPreviaInsignia {
  return {
    proveedor,
    nombre: '',
    emisor: '',
    descripcion: null,
    fecha_emision: null,
    fecha_expiracion: null,
    habilidades: [],
    url_verificacion: null,
    id_externo: null,
    url_origen: urlOrigen,
    imagen: null,
    avisos,
  };
}

/** Primera URL http(s) de la entrada (enlace suelto, `src`/`href` de un embed). */
export function extraerUrl(entrada: string): string | null {
  const texto = entrada.trim();
  if (/^https?:\/\/\S+$/i.test(texto)) return texto;
  const m = texto.match(
    /(?:src|href)\s*=\s*["']\s*((?:https?:)?\/\/[^"'\s]+)/i,
  );
  const candidato = m?.[1] ?? texto.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
  if (!candidato) return null;
  return candidato.startsWith('//') ? `https:${candidato}` : candidato;
}

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodificarEntidades(texto: string): string {
  return texto.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entero, ent: string) => {
      if (ent[0] === '#') {
        const codigo =
          ent[1].toLowerCase() === 'x'
            ? parseInt(ent.slice(2), 16)
            : parseInt(ent.slice(1), 10);
        try {
          return String.fromCodePoint(codigo);
        } catch {
          return entero;
        }
      }
      return ENTIDADES[ent.toLowerCase()] ?? entero;
    },
  );
}

/** Normaliza fechas ISO/`YYYY-MM-DD...` a `YYYY-MM-DD` (o `null`). */
export function aFechaIso(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const m = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : `${m[1]}-${m[2]}-${m[3]}`;
}

/** Resuelve `ref` contra `base`; solo devuelve URLs https. */
export function resolverUrlHttps(ref: string, base: string): string | null {
  try {
    const url = new URL(ref, base);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Lee los `<meta>` de un HTML (clave `property` o `name` en minúsculas). */
export function leerMetaTags(html: string): {
  meta: Record<string, string>;
  titulo: string | null;
} {
  const meta: Record<string, string> = {};
  for (const etiqueta of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const atributos: Record<string, string> = {};
    for (const a of etiqueta.matchAll(
      /([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    )) {
      atributos[a[1].toLowerCase()] = a[2] ?? a[3] ?? '';
    }
    const clave = (atributos.property ?? atributos.name)?.toLowerCase();
    if (clave && atributos.content !== undefined && !(clave in meta)) {
      meta[clave] = decodificarEntidades(atributos.content).trim();
    }
  }
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return { meta, titulo: t ? decodificarEntidades(t[1]).trim() : null };
}

/** Nombre legible derivado del último segmento de una URL. */
export function nombreDeArchivo(url: string): string {
  try {
    const segmento = decodeURIComponent(
      new URL(url).pathname.split('/').filter(Boolean).pop() ?? '',
    );
    return segmento
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[-_+]+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

export function extensionDeMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

export const TIPOS_IMAGEN = [
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
];
