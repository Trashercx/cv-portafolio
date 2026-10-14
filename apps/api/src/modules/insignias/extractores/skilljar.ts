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

// Host anclado: `verify.skilljar.com` o `<sub>.skilljar.com`, ruta `.../c/<id>`.
const RE_SKILLJAR =
  /^https:\/\/(?:[a-z0-9-]+\.)?skilljar\.com\/(?:[^?#\s]*\/)?c\/([A-Za-z0-9]+)(?:[/?#]\S*)?$/i;

export function idDeSkilljar(entrada: string): string | null {
  const url = extraerUrl(entrada);
  return url ? (RE_SKILLJAR.exec(url)?.[1] ?? null) : null;
}

const MESES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** "May 27, 2026" / "Nov. 27, 2026" / "Sept. 3, 2025" → `YYYY-MM-DD` (o `null`). */
export function fechaIngles(texto: string | null | undefined): string | null {
  const m = texto
    ?.trim()
    .match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (!m) return null;
  const mes = MESES[m[1].slice(0, 3).toLowerCase()];
  const dia = Number(m[2]);
  const anio = Number(m[3]);
  if (!mes || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia)
    return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}

/** Texto visible: sin `<script>`/`<style>`, sin etiquetas, espacios colapsados. */
export function textoPlano(html: string): string {
  return limpiarTexto(html, 200_000);
}

const FECHA = String.raw`[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}`;

function fechaTras(texto: string, rotulo: string): string | null {
  const m = new RegExp(`${rotulo}\\s*:?\\s*(${FECHA})`, 'i').exec(texto);
  return fechaIngles(m?.[1]);
}

/** Certificados de Skilljar (Anthropic Academy y otros): modo automático. */
export const skilljarExtractor: Extractor = {
  acepta: (entrada) => idDeSkilljar(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const id = idDeSkilljar(entrada) as string;
    const url = extraerUrl(entrada) as string;
    const recurso = await ctx.descargar(url, { accept: 'text/html' });
    if (
      recurso.contentType !== 'text/html' &&
      recurso.contentType !== 'application/xhtml+xml'
    ) {
      throw new ExtractorNoAplica();
    }

    const pagina = recurso.buffer.toString('utf8');
    const { meta } = leerMetaTags(pagina);
    const texto = textoPlano(pagina);
    const vista = vistaVacia('skilljar', entrada.trim(), [
      'Datos tomados de la página del certificado: revisa los datos.',
    ]);

    vista.nombre = limpiarTexto(
      (meta['og:title'] ?? '').replace(/^\s*Certificate for\s+/i, ''),
      200,
    );
    const emisorTexto =
      /Offered By\s+(.+?)(?=\s+(?:Certificate Expires|Completion Date|Course Completed|Certificate (?:ID|Number))\b|$)/i.exec(
        texto,
      )?.[1];
    vista.emisor = limpiarTexto(emisorTexto || meta['og:site_name'], 200);
    vista.descripcion = limpiarTexto(meta['og:description'], 5000) || null;
    vista.fecha_emision = fechaTras(texto, 'Completion Date');
    vista.fecha_expiracion = fechaTras(texto, 'Certificate Expires');
    vista.url_verificacion = url;
    vista.id_externo = id;

    const imagen = meta['og:image']
      ? resolverUrlHttps(meta['og:image'], recurso.urlFinal)
      : null;
    if (imagen) {
      vista.imagen = { url: imagen };
      vista.avisos.push(
        'La URL de la imagen caduca: guarda la insignia pronto.',
      );
    } else {
      vista.avisos.push('La página no declara una imagen https.');
    }
    return vista;
  },
};
