import { genericoExtractor } from './generico';
import { AYUDA_DATACAMP } from './proveedores';
import {
  ContextoExtraccion,
  crearContextoExtraccion,
  Extractor,
  VistaPreviaInsignia,
} from './tipos';
import { extraerUrl, vistaVacia } from './utils';

const RE_DATACAMP =
  /^https:\/\/(?:www\.)?datacamp\.com\/(?:completed\/)?statement-of-accomplishment\/(?:course|track)\/([0-9a-f]{40})(?:[/?#]\S*)?$/i;

export function hashDeDatacamp(entrada: string): string | null {
  const url = extraerUrl(entrada);
  return url ? (RE_DATACAMP.exec(url)?.[1]?.toLowerCase() ?? null) : null;
}

/**
 * Declaraciones de logro de DataCamp (Fase 7e, UC-35): modo archivo. DataCamp
 * bloquea la lectura automática (403 / "Just a moment"); se intenta por si
 * deja de hacerlo y, si falla, se devuelven los datos parciales con el aviso.
 */
export const datacampExtractor: Extractor = {
  acepta: (entrada) => hashDeDatacamp(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const hash = hashDeDatacamp(entrada) as string;
    const url = extraerUrl(entrada) as string;

    try {
      const vista = await genericoExtractor.extraer(entrada, ctx);
      if (
        vista.nombre &&
        !/just a moment|attention required/i.test(vista.nombre) &&
        vista.imagen
      ) {
        return {
          ...vista,
          proveedor: 'datacamp',
          modo_proveedor: 'automatico',
          emisor: 'DataCamp',
          id_externo: hash,
          url_verificacion: url,
        };
      }
    } catch {
      // 403, red, destino no permitido o contenido no HTML: camino parcial.
    }

    const parcial = vistaVacia('datacamp', entrada.trim(), [AYUDA_DATACAMP]);
    parcial.emisor = 'DataCamp';
    parcial.url_verificacion = url;
    parcial.id_externo = hash;
    return parcial;
  },
};
