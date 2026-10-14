import {
  ContextoExtraccion,
  crearContextoExtraccion,
  Extractor,
  ExtractorNoAplica,
  VistaPreviaInsignia,
} from './tipos';
import {
  extraerUrl,
  leerMetaTags,
  limpiarTexto,
  resolverUrlHttps,
  vistaVacia,
} from './utils';

/** Respaldo para cualquier página HTML: `og:*` / `twitter:image` / `title`. */
export const genericoExtractor: Extractor = {
  acepta: (entrada) => extraerUrl(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const url = extraerUrl(entrada) as string;
    const recurso = await ctx.descargar(url, { accept: 'text/html' });
    if (
      recurso.contentType !== 'text/html' &&
      recurso.contentType !== 'application/xhtml+xml'
    ) {
      throw new ExtractorNoAplica();
    }

    const { meta, titulo } = leerMetaTags(recurso.buffer.toString('utf8'));
    const vista = vistaVacia('generico', entrada.trim(), [
      'Datos tomados de los metadatos de la página: revisa los datos.',
    ]);
    vista.nombre = limpiarTexto(meta['og:title'] || titulo, 200);
    vista.descripcion =
      limpiarTexto(meta['og:description'] || meta.description, 5000) || null;
    vista.emisor = limpiarTexto(
      meta['og:site_name'] || new URL(recurso.urlFinal).hostname,
      200,
    );
    vista.url_verificacion = recurso.urlFinal;
    const refImagen = meta['og:image'] || meta['twitter:image'];
    const imagen = refImagen
      ? resolverUrlHttps(refImagen, recurso.urlFinal)
      : null;
    vista.imagen = imagen ? { url: imagen } : null;
    if (!imagen) vista.avisos.push('La página no declara una imagen https.');
    return vista;
  },
};
