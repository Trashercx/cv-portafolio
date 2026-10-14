import { RedSeguraError } from '../red-segura';
import {
  ContextoExtraccion,
  crearContextoExtraccion,
  Extractor,
  VistaPreviaInsignia,
} from './tipos';
import { aFechaIso, leerMetaTags, resolverUrlHttps, vistaVacia } from './utils';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const RE_ENLACE = new RegExp(
  `credly\.com/(?:badges|embedded_badge)/(${UUID})`,
  'i',
);
const RE_EMBED = new RegExp(`data-share-badge-id\s*=\s*["'](${UUID})["']`, 'i');

/** Rutas `/users/<x>` que son navegación global de Credly, no un titular. */
const SLUGS_NAVEGACION = new Set([
  'sign_in',
  'sign_up',
  'sign_out',
  'login',
  'logout',
  'password',
  'edit',
  'auth',
  'confirmation',
  'unlock',
  'new',
  'settings',
  'notifications',
]);

const MAX_PAGINAS = 5;

interface CredlyBadge {
  id?: string;
  issued_at_date?: string;
  expires_at_date?: string | null;
  image_url?: string;
  badge_template?: {
    name?: string;
    description?: string;
    skills?: { name?: string }[];
  };
  issuer?: {
    entities?: { primary?: boolean; entity?: { name?: string } }[];
  };
}

export function idDeCredly(entrada: string): string | null {
  const m = entrada.match(RE_ENLACE) ?? entrada.match(RE_EMBED);
  return m ? m[1].toLowerCase() : null;
}

/** Credly: `credly.com/badges/<id>`, `embedded_badge/<id>` o código de embed. */
export const credlyExtractor: Extractor = {
  acepta: (entrada) => idDeCredly(entrada) !== null,

  async extraer(
    entrada: string,
    ctx: ContextoExtraccion = crearContextoExtraccion(),
  ): Promise<VistaPreviaInsignia> {
    const id = idDeCredly(entrada) as string;
    const urlBadge = `https://www.credly.com/badges/${id}`;
    const vista = vistaVacia('credly', entrada.trim(), []);
    vista.proveedor = 'credly';
    vista.id_externo = id;
    vista.url_verificacion = urlBadge;

    let html: string;
    try {
      const pagina = await ctx.descargar(urlBadge, { accept: 'text/html' });
      html = pagina.buffer.toString('utf8');
    } catch (error) {
      vista.avisos.push(
        `No se pudo leer la página de Credly: ${mensaje(error)}`,
      );
      return vista;
    }

    const slug = buscarSlugTitular(html);
    if (slug) {
      try {
        const badge = await buscarEnListado(ctx, slug, id);
        if (badge) {
          mapear(vista, badge);
          return vista;
        }
        vista.avisos.push(
          'La insignia no aparece en el perfil público del titular; se usaron los metadatos de la página.',
        );
      } catch (error) {
        vista.avisos.push(
          `No se pudo leer el listado público de Credly (${mensaje(error)}); se usaron los metadatos de la página.`,
        );
      }
    } else {
      vista.avisos.push(
        'No se encontró el perfil público del titular; se usaron los metadatos de la página.',
      );
    }

    respaldoOpenGraph(vista, html, urlBadge);
    return vista;
  },
};

function mensaje(error: unknown): string {
  return error instanceof RedSeguraError || error instanceof Error
    ? error.message
    : 'error desconocido';
}

/** Primer `href="/users/<slug>"` que no sea navegación global. */
export function buscarSlugTitular(html: string): string | null {
  const re =
    /href\s*=\s*["'](?:https?:\/\/(?:www\.)?credly\.com)?\/users\/([^/"'?#\s]+)/gi;
  for (const m of html.matchAll(re)) {
    const slug = m[1];
    if (!SLUGS_NAVEGACION.has(slug.toLowerCase())) return slug;
  }
  return null;
}

async function buscarEnListado(
  ctx: ContextoExtraccion,
  slug: string,
  id: string,
): Promise<CredlyBadge | null> {
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = `https://www.credly.com/users/${encodeURIComponent(slug)}/badges.json${pagina > 1 ? `?page=${pagina}` : ''}`;
    const recurso = await ctx.descargar(url, {
      tipos: ['application/json'],
      accept: 'application/json',
    });
    const cuerpo = JSON.parse(recurso.buffer.toString('utf8')) as {
      data?: CredlyBadge[];
      metadata?: { total_pages?: number };
    };
    const data = Array.isArray(cuerpo.data) ? cuerpo.data : [];
    const encontrada = data.find((b) => b.id?.toLowerCase() === id);
    if (encontrada) return encontrada;
    const total = cuerpo.metadata?.total_pages;
    if (data.length === 0 || !total || pagina >= total) return null;
  }
  return null;
}

function mapear(vista: VistaPreviaInsignia, badge: CredlyBadge): void {
  const plantilla = badge.badge_template ?? {};
  const entidades = badge.issuer?.entities ?? [];
  const emisor = (entidades.find((e) => e.primary) ?? entidades[0])?.entity
    ?.name;

  vista.nombre = plantilla.name?.trim() ?? '';
  vista.emisor = emisor?.trim() ?? '';
  vista.descripcion = plantilla.description?.trim() || null;
  vista.fecha_emision = aFechaIso(badge.issued_at_date);
  vista.fecha_expiracion = aFechaIso(badge.expires_at_date);
  vista.habilidades = (plantilla.skills ?? [])
    .map((s) => s.name?.trim() ?? '')
    .filter(Boolean);

  const imagen = badge.image_url
    ? resolverUrlHttps(
        badge.image_url.replace(/\/size\/\d+x\d+\//, '/'),
        'https://www.credly.com',
      )
    : null;
  vista.imagen = imagen ? { url: imagen } : null;
  if (!imagen)
    vista.avisos.push('Credly no devolvió una imagen para la insignia.');
}

function respaldoOpenGraph(
  vista: VistaPreviaInsignia,
  html: string,
  urlBase: string,
): void {
  const { meta, titulo } = leerMetaTags(html);
  vista.nombre = meta['og:title'] || titulo || '';
  vista.descripcion = meta['og:description'] || null;
  const imagen = meta['og:image']
    ? resolverUrlHttps(meta['og:image'], urlBase)
    : null;
  vista.imagen = imagen
    ? { url: imagen.replace(/\/size\/\d+x\d+\//, '/') }
    : null;
  vista.avisos.push('Revisa los datos: completa emisor, fechas y habilidades.');
}
