import { validarImagen } from '../../media/validar-imagen';
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

    // El tipo se decide por contenido, no por el `Content-Type` remoto.
    const imagen = await validarImagen(recurso.buffer);
    if (!imagen) {
      return vistaVacia('generico', entrada.trim(), [
        'El recurso no es una imagen válida (PNG, JPEG, WebP, AVIF o SVG sin scripts): completa los datos a mano.',
      ]);
    }

    const vista = vistaVacia('generico', entrada.trim(), [
      'Solo se encontró la imagen: completa nombre, emisor y demás datos.',
    ]);
    vista.nombre = nombreDeArchivo(recurso.urlFinal);
    vista.imagen = {
      url: recurso.urlFinal,
      ancho: imagen.ancho,
      alto: imagen.alto,
      formato: imagen.formato,
    };
    return vista;
  },
};
