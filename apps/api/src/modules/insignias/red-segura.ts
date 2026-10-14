import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Descarga remota segura (Fase 7d, 7d.2, UC-35). El endpoint de importación
 * hace peticiones salientes con una URL que escribe el administrador, así que
 * es un vector de SSRF: toda descarga de `modules/insignias` pasa por
 * `descargarRecursoSeguro`, que:
 *
 * - acepta solo `https:` y rechaza credenciales embebidas en la URL;
 * - resuelve el nombre con `dns.lookup({ all: true })` y rechaza el destino si
 *   CUALQUIER dirección es privada, loopback, link-local, de metadata (v4 y
 *   v6, ver `esIpPrivada`);
 * - sigue como máximo 3 redirecciones, revalidando cada destino con las mismas
 *   reglas (`redirect: 'manual'`);
 * - no envía cookies ni credenciales y usa un `User-Agent` propio;
 * - limita el tiempo total (`AbortController`) y el tamaño (corta la lectura
 *   del stream al superar `maxBytes`).
 *
 * Limitación conocida: entre `lookup` y la conexión de `fetch` existe una
 * ventana mínima (DNS rebinding) porque `fetch` vuelve a resolver el nombre;
 * se acepta porque el administrador es el único usuario autenticado, la
 * ruta lleva throttling y los demás controles (https, redirecciones
 * revalidadas, tipos, tamaño) siguen vigentes.
 */

export const USER_AGENT_INSIGNIAS = 'cv-portafolio-insignias/1.0';
export const MAX_BYTES_DEFECTO = 10 * 1024 * 1024;
export const TIMEOUT_MS_DEFECTO = 8000;
const MAX_REDIRECCIONES = 3;

/** Fallo controlado de red o de política; los llamadores lo traducen a `avisos`. */
export class RedSeguraError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'RedSeguraError';
  }
}

export interface OpcionesDescarga {
  /** Tipos MIME permitidos (sin parámetros). Si se omite, cualquiera. */
  tipos?: string[];
  maxBytes?: number;
  timeoutMs?: number;
  /** Cabecera `Accept` de la petición. */
  accept?: string;
}

export interface RecursoDescargado {
  buffer: Buffer;
  /** En minúsculas y sin parámetros (`image/png`). */
  contentType: string;
  /** URL tras seguir las redirecciones. */
  urlFinal: string;
}

// ---------------------------------------------------------------------------
// Rangos de IP bloqueados
// ---------------------------------------------------------------------------

function esV4Privada(a: number, b: number): boolean {
  return (
    a === 0 || // 0.0.0.0/8 ("esta red")
    a === 10 || // 10/8
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 (CGNAT)
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local y metadata en la nube
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12
    (a === 192 && b === 168) || // 192.168/16
    (a === 192 && b === 0) || // 192.0.0.0/24 y 192.0.2.0/24
    (a === 198 && (b === 18 || b === 19)) || // 198.18/15 (benchmarking)
    a >= 224 // multicast y reservado
  );
}

/** Expande una dirección IPv6 a 8 grupos de 16 bits; `null` si no es válida. */
function parsearV6(ip: string): number[] | null {
  let texto = ip.split('%')[0].toLowerCase();
  // Cola IPv4 embebida (::ffff:1.2.3.4) -> dos grupos hex.
  const v4 = texto.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [o1, o2, o3, o4] = v4.slice(1).map(Number);
    if ([o1, o2, o3, o4].some((n) => n > 255)) return null;
    const alto = ((o1 << 8) | o2).toString(16);
    const bajo = ((o3 << 8) | o4).toString(16);
    texto = texto.slice(0, v4.index) + `${alto}:${bajo}`;
  }
  const mitades = texto.split('::');
  if (mitades.length > 2) return null;
  const izquierda = mitades[0] ? mitades[0].split(':') : [];
  const derecha =
    mitades.length === 2 && mitades[1] ? mitades[1].split(':') : [];
  let grupos: string[];
  if (mitades.length === 2) {
    const faltan = 8 - izquierda.length - derecha.length;
    if (faltan < 1) return null;
    grupos = [...izquierda, ...Array<string>(faltan).fill('0'), ...derecha];
  } else {
    grupos = izquierda;
  }
  if (grupos.length !== 8) return null;
  const numeros = grupos.map((g) =>
    /^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN,
  );
  return numeros.some(Number.isNaN) ? null : numeros;
}

/**
 * `true` si la IP (v4 o v6) NO debe contactarse: privada, loopback,
 * link-local, metadata, multicast o reservada. Cualquier valor que no sea una
 * IP válida también devuelve `true` (falla cerrado).
 */
export function esIpPrivada(ip: string): boolean {
  const version = isIP(ip.split('%')[0]);
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    return esV4Privada(a, b);
  }
  if (version === 6) {
    const g = parsearV6(ip);
    if (!g) return true;
    const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
    // :: (sin especificar) y ::1 (loopback)
    if (g.slice(0, 7).every((x) => x === 0) && (g7 === 0 || g7 === 1)) {
      return true;
    }
    // IPv4 mapeada (::ffff:a.b.c.d) o compatible: se valida como v4.
    if (
      g0 === 0 &&
      g1 === 0 &&
      g2 === 0 &&
      g3 === 0 &&
      g4 === 0 &&
      g5 === 0xffff
    ) {
      return esV4Privada(g6 >> 8, g6 & 0xff);
    }
    // NAT64 (64:ff9b::/96): la v4 embebida manda.
    if (
      g0 === 0x64 &&
      g1 === 0xff9b &&
      g2 === 0 &&
      g3 === 0 &&
      g4 === 0 &&
      g5 === 0
    ) {
      return esV4Privada(g6 >> 8, g6 & 0xff);
    }
    if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 (ULA)
    if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 (link-local)
    if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 (multicast)
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------

async function validarDestino(url: URL): Promise<void> {
  if (url.protocol !== 'https:') {
    throw new RedSeguraError('Solo se permiten enlaces https');
  }
  if (url.username || url.password) {
    throw new RedSeguraError('El enlace no puede incluir credenciales');
  }
  // URL.hostname deja los corchetes de IPv6 literales.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host) throw new RedSeguraError('El enlace no tiene host');

  if (isIP(host)) {
    if (esIpPrivada(host)) {
      throw new RedSeguraError('El destino no está permitido (red privada)');
    }
    return;
  }

  let direcciones: { address: string }[];
  try {
    direcciones = await lookup(host, { all: true });
  } catch {
    throw new RedSeguraError(`No se pudo resolver el dominio ${host}`);
  }
  if (direcciones.length === 0) {
    throw new RedSeguraError(`No se pudo resolver el dominio ${host}`);
  }
  if (direcciones.some((d) => esIpPrivada(d.address))) {
    throw new RedSeguraError('El destino no está permitido (red privada)');
  }
}

async function leerCuerpo(
  respuesta: Response,
  maxBytes: number,
): Promise<Buffer> {
  const declarado = Number(respuesta.headers.get('content-length'));
  if (Number.isFinite(declarado) && declarado > maxBytes) {
    await respuesta.body?.cancel().catch(() => undefined);
    throw new RedSeguraError('El recurso supera el tamaño máximo permitido');
  }
  if (!respuesta.body) return Buffer.alloc(0);

  const lector = respuesta.body.getReader();
  const partes: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await lector.cancel().catch(() => undefined);
      throw new RedSeguraError('El recurso supera el tamaño máximo permitido');
    }
    partes.push(Buffer.from(value));
  }
  return Buffer.concat(partes, total);
}

export async function descargarRecursoSeguro(
  url: string,
  opciones: OpcionesDescarga = {},
): Promise<RecursoDescargado> {
  const maxBytes = opciones.maxBytes ?? MAX_BYTES_DEFECTO;
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_MS_DEFECTO;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    let actual: URL;
    try {
      actual = new URL(url);
    } catch {
      throw new RedSeguraError('El enlace no es una URL válida');
    }

    for (let saltos = 0; ; saltos++) {
      await validarDestino(actual);

      const respuesta = await fetch(actual.toString(), {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        signal: controlador.signal,
        headers: {
          'User-Agent': USER_AGENT_INSIGNIAS,
          Accept: opciones.accept ?? '*/*',
        },
      });

      if (respuesta.status >= 300 && respuesta.status < 400) {
        const destino = respuesta.headers.get('location');
        await respuesta.body?.cancel().catch(() => undefined);
        if (!destino) {
          throw new RedSeguraError('Redirección sin destino');
        }
        if (saltos >= MAX_REDIRECCIONES) {
          throw new RedSeguraError('Demasiadas redirecciones');
        }
        try {
          actual = new URL(destino, actual);
        } catch {
          throw new RedSeguraError('Redirección a una URL inválida');
        }
        continue;
      }

      if (!respuesta.ok) {
        await respuesta.body?.cancel().catch(() => undefined);
        throw new RedSeguraError(`El servidor respondió ${respuesta.status}`);
      }

      const contentType = (respuesta.headers.get('content-type') ?? '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (opciones.tipos && !opciones.tipos.includes(contentType)) {
        await respuesta.body?.cancel().catch(() => undefined);
        throw new RedSeguraError(
          `Tipo de contenido no permitido (${contentType || 'desconocido'})`,
        );
      }

      const buffer = await leerCuerpo(respuesta, maxBytes);
      return { buffer, contentType, urlFinal: actual.toString() };
    }
  } catch (error) {
    if (error instanceof RedSeguraError) throw error;
    if (controlador.signal.aborted) {
      throw new RedSeguraError('Se agotó el tiempo de espera de la descarga');
    }
    throw new RedSeguraError(
      `No se pudo descargar el recurso (${error instanceof Error ? error.message : 'error de red'})`,
    );
  } finally {
    clearTimeout(temporizador);
  }
}
