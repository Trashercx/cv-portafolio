import { dimensionesDe } from './png-horneado';
import {
  ContextoExtraccion,
  crearContextoExtraccion,
  Extractor,
  ExtractorNoAplica,
  VistaPreviaInsignia,
} from './tipos';
import { extraerUrl, nombreDeArchivo, TIPOS_IMAGEN, vistaVacia } from './utils';

/** La URL responde `image/png|svg+xml|jpeg|webp`: solo hay imagen. */
export const imagenDirectaExtractor: Extractor = {
  acepta: (entrada) => extraerUrl(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const url = extraerUrl(entrada) as string;
    const recurso = await ctx.descargar(url, { accept: 'image/*' });
    if (!TIPOS_IMAGEN.includes(recurso.contentType)) {
      throw new ExtractorNoAplica();
    }

    const vista = vistaVacia('generico', entrada.trim(), [
      'Solo se encontró la imagen: completa nombre, emisor y demás datos.',
    ]);
    vista.nombre = nombreDeArchivo(recurso.urlFinal);
    vista.imagen = {
      url: recurso.urlFinal,
      ...(await dimensionesDe(recurso.buffer)),
    };
    return vista;
  },
};
