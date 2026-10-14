import {
  descargarRecursoSeguro,
  OpcionesDescarga,
  RecursoDescargado,
} from '../red-segura';

export type ProveedorInsignia =
  'credly' | 'open_badges' | 'generico' | 'manual';

/** Imagen candidata de la vista previa (sin descargar al servidor todavía). */
export interface ImagenVistaPrevia {
  url: string;
  ancho?: number;
  alto?: number;
  formato?: string;
}

/**
 * Resultado de `POST /admin/insignias/importar` (Fase 7d, UC-35): vista previa
 * SIN persistir. Los textos que no se pudieron obtener quedan vacíos (`''`) y
 * el motivo viaja en `avisos`; las fechas son `YYYY-MM-DD`.
 */
export interface VistaPreviaInsignia {
  proveedor: ProveedorInsignia;
  nombre: string;
  emisor: string;
  descripcion: string | null;
  fecha_emision: string | null;
  fecha_expiracion: string | null;
  habilidades: string[];
  url_verificacion: string | null;
  id_externo: string | null;
  url_origen: string | null;
  imagen: ImagenVistaPrevia | null;
  avisos: string[];
}

/**
 * Descargas de UNA importación. Memoiza por URL y opciones para que la cadena
 * de extractores no repita la misma petición; siempre delega en
 * `descargarRecursoSeguro` (los errores también se memoizan).
 */
export interface ContextoExtraccion {
  descargar(
    url: string,
    opciones?: OpcionesDescarga,
  ): Promise<RecursoDescargado>;
}

export function crearContextoExtraccion(): ContextoExtraccion {
  const cache = new Map<string, Promise<RecursoDescargado>>();
  return {
    descargar(url, opciones = {}) {
      // `accept` no cambia el recurso: no entra en la clave.
      const clave = `${url}|${JSON.stringify({ ...opciones, accept: undefined })}`;
      let pendiente = cache.get(clave);
      if (!pendiente) {
        pendiente = descargarRecursoSeguro(url, opciones);
        cache.set(clave, pendiente);
      }
      return pendiente;
    },
  };
}

export interface Extractor {
  /** Decide, sin red, si la entrada le corresponde. */
  acepta(entrada: string): boolean;
  extraer(
    entrada: string,
    ctx?: ContextoExtraccion,
  ): Promise<VistaPreviaInsignia>;
}

/**
 * Un extractor la lanza cuando, tras mirar el recurso, descubre que no es de
 * su tipo; `importar` pasa entonces al siguiente de la cadena.
 */
export class ExtractorNoAplica extends Error {
  constructor(mensaje = 'El recurso no corresponde a este extractor') {
    super(mensaje);
    this.name = 'ExtractorNoAplica';
  }
}
