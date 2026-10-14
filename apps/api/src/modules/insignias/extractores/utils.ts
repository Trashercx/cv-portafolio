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

const RE_ETIQUETA = /<[^>]*>/g;
// <script>/<style> se eliminan con su contenido (no solo las etiquetas).
const RE_BLOQUE_ACTIVO = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
// eslint-disable-next-line no-control-regex
const RE_CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

function quitarEtiquetas(texto: string): string {
  // Repite hasta estabilizar (`<<b>script>` deja `<script>` tras una pasada).
  let previo: string;
  let actual = texto;
  do {
    previo = actual;
    actual = actual.replace(RE_BLOQUE_ACTIVO, ' ').replace(RE_ETIQUETA, ' ');
  } while (actual !== previo);
  return actual;
}

/**
 * Saneado de texto externo (Fase 7d, UC-35): convierte a string, quita
 * etiquetas HTML, decodifica entidades SOLO despues (y vuelve a quitar
 * etiquetas si la decodificacion las reintrodujo), elimina caracteres de
 * control, colapsa espacios y trunca a `max`. Devuelve '' si no es texto.
 */
export function limpiarTexto(valor: unknown, max: number): string {
  if (typeof valor !== 'string' && typeof valor !== 'number') return '';
  let texto = quitarEtiquetas(String(valor));
  texto = quitarEtiquetas(decodificarEntidades(texto));
  texto = texto.replace(RE_CONTROL, ' ').replace(/\s+/g, ' ').trim();
  return texto.slice(0, max).trim();
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
    case 'image/avif':
      return 'avif';
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
  'image/avif',
];

/** Tope de URL de `CreateInsigniaDto`: "Guardar" nunca debe fallar por longitud. */
const MAX_URL = 2000;

function limpiarUrl(valor: string | null): string | null {
  if (!valor) return null;
  const url = valor.trim();
  return url.length > 0 && url.length <= MAX_URL ? url : null;
}

/**
 * Saneado final de TODA vista previa (Fase 7d, UC-35): texto sin HTML ni
 * control, topes del DTO (nombre/emisor/id_externo 200, descripcion 5000,
 * habilidades <= 50 de <= 100 caracteres y unicas, URLs <= 2000).
 */
export function sanearVista(vista: VistaPreviaInsignia): VistaPreviaInsignia {
  const habilidades = [
    ...new Set(
      vista.habilidades.map((h) => limpiarTexto(h, 100)).filter(Boolean),
    ),
  ].slice(0, 50);
  return {
    ...vista,
    nombre: limpiarTexto(vista.nombre, 200),
    emisor: limpiarTexto(vista.emisor, 200),
    descripcion: limpiarTexto(vista.descripcion, 5000) || null,
    id_externo: limpiarTexto(vista.id_externo, 200) || null,
    url_verificacion: limpiarUrl(vista.url_verificacion),
    url_origen: limpiarUrl(vista.url_origen),
    habilidades,
    avisos: vista.avisos.map((a) => limpiarTexto(a, 500)).filter(Boolean),
    imagen:
      vista.imagen && vista.imagen.url.length <= MAX_URL ? vista.imagen : null,
  };
}
