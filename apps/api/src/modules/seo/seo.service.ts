import { Injectable } from '@nestjs/common';
import {
  SnapshotMedia,
  SnapshotSitio,
} from '../versiones-sitio/snapshot.types';
import { VersionesSitioService } from '../versiones-sitio/versiones-sitio.service';
import { escaparHtml, recortarDescripcion } from './texto';

/** Metadatos ya resueltos de una ruta pública (Fase 8, UC-34). */
interface MetadatosRuta {
  titulo: string;
  descripcion?: string;
  tipo?: 'profile' | 'article' | 'website';
  /** Ruta canónica (pathname) de la página; sin ella no se emiten og/canonical. */
  ruta?: string;
  imagen?: SnapshotMedia | null;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const MARCA = 'data-meta-estatico';

/**
 * Fase 8, UC-34: genera, a partir de la última versión publicada, el
 * fragmento de metadatos que nginx inyecta por SSI en `index.html`, el
 * sitemap y el robots.txt. Lee solo el snapshot publicado, nunca las tablas
 * en vivo (misma regla que `PublicoController`, UC-12).
 */
@Injectable()
export class SeoService {
  constructor(private readonly versionesSitioService: VersionesSitioService) {}

  private origen(): string {
    return (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').replace(
      /\/+$/,
      '',
    );
  }

  /** Extrae el pathname de `X-Ruta-Publica` (ignora query y hash; default `/`). */
  normalizarRuta(cabecera: string | string[] | undefined): string {
    const bruto = Array.isArray(cabecera) ? cabecera[0] : cabecera;
    if (!bruto) return '/';
    let ruta = bruto.split(/[?#]/)[0].trim();
    if (!ruta.startsWith('/')) ruta = `/${ruta}`;
    ruta = ruta.replace(/\/{2,}/g, '/');
    if (ruta.length > 1) ruta = ruta.replace(/\/+$/, '');
    return ruta || '/';
  }

  private urlAbsoluta(url: string): string {
    try {
      return new URL(url, `${this.origen()}/`).toString();
    } catch {
      return url;
    }
  }

  /** `GET /seo/metadatos`: fragmento HTML para `<head>` (siempre válido). */
  async generarFragmento(cabeceraRuta?: string | string[]): Promise<string> {
    const ruta = this.normalizarRuta(cabeceraRuta);

    // El panel no depende de la versión publicada.
    if (ruta === '/admin' || ruta.startsWith('/admin/')) {
      return this.renderizar({
        titulo: 'Panel de administración',
        noindex: true,
      });
    }

    const version = await this.versionesSitioService.obtenerUltimaPublicada();
    if (!version) {
      return `<title ${MARCA}>Portafolio</title>`;
    }
    const snapshot = version.snapshot as unknown as SnapshotSitio;

    return this.renderizar(this.resolverRuta(ruta, snapshot));
  }

  private resolverRuta(ruta: string, snapshot: SnapshotSitio): MetadatosRuta {
    const noEncontrada: MetadatosRuta = {
      titulo: 'Página no encontrada',
      noindex: true,
    };

    if (ruta === '/') {
      const perfil = snapshot.perfil;
      if (!perfil) return { titulo: 'Portafolio', ruta: '/', tipo: 'website' };
      const descripcion = recortarDescripcion(perfil.resumen_bio ?? '');
      const imagen = perfil.imagen_perfil ?? null;
      const redes = snapshot.redes_sociales ?? [];
      return {
        titulo: `${perfil.nombre_completo} — ${perfil.titulo_profesional}`,
        descripcion,
        tipo: 'profile',
        ruta: '/',
        imagen,
        // Mismo JSON que `DatosEstructuradosPersona` (web).
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: perfil.nombre_completo,
          jobTitle: perfil.titulo_profesional,
          description: descripcion,
          ...(imagen ? { image: this.urlAbsoluta(imagen.url) } : {}),
          url: `${this.origen()}/`,
          ...(redes.length > 0
            ? { sameAs: redes.map((red) => red.url as string) }
            : {}),
        },
      };
    }

    const coincidencia = /^\/(proyecto|certificacion|logro)\/([^/]+)$/.exec(
      ruta,
    );
    if (!coincidencia) return noEncontrada;
    const [, tipoRuta, idCodificado] = coincidencia;
    let id: string;
    try {
      id = decodeURIComponent(idCodificado);
    } catch {
      return noEncontrada;
    }

    if (tipoRuta === 'proyecto') {
      const p = snapshot.proyectos?.find((x) => x.id === id);
      if (!p) return noEncontrada;
      const imagenes =
        (p.imagenes as { media?: SnapshotMedia }[] | undefined) ?? [];
      return {
        titulo: String(p.titulo),
        descripcion: recortarDescripcion(String(p.descripcion ?? '')),
        tipo: 'article',
        ruta,
        imagen: imagenes[0]?.media ?? null,
      };
    }

    if (tipoRuta === 'certificacion') {
      const c = snapshot.certificaciones?.find((x) => x.id === id);
      if (!c) return noEncontrada;
      const logo = c.logo as SnapshotMedia | null | undefined;
      return {
        titulo: `${String(c.nombre)} — ${String(c.institucion)}`,
        descripcion: `Certificación «${String(c.nombre)}» emitida por ${String(c.institucion)}.`,
        tipo: 'article',
        ruta,
        imagen: logo?.tipo === 'imagen' ? logo : null,
      };
    }

    const l = snapshot.logros?.find((x) => x.id === id);
    if (!l) return noEncontrada;
    return {
      titulo: String(l.titulo),
      descripcion: recortarDescripcion(String(l.descripcion ?? '')),
      tipo: 'article',
      ruta,
    };
  }

  private renderizar(m: MetadatosRuta): string {
    const e = escaparHtml;
    const nodos: string[] = [`<title ${MARCA}>${e(m.titulo)}</title>`];

    if (m.noindex) {
      nodos.push(`<meta ${MARCA} name="robots" content="noindex">`);
    }

    if (m.ruta !== undefined) {
      const url = this.urlCanonica(m.ruta);
      const imagenUrl = m.imagen ? this.urlAbsoluta(m.imagen.url) : null;
      const meta = (atributo: string, nombre: string, valor: string) =>
        `<meta ${MARCA} ${atributo}="${nombre}" content="${e(valor)}">`;

      if (m.descripcion) nodos.push(meta('name', 'description', m.descripcion));
      nodos.push(`<link ${MARCA} rel="canonical" href="${e(url)}">`);
      nodos.push(meta('property', 'og:title', m.titulo));
      if (m.descripcion) {
        nodos.push(meta('property', 'og:description', m.descripcion));
      }
      nodos.push(meta('property', 'og:type', m.tipo ?? 'website'));
      nodos.push(meta('property', 'og:url', url));
      if (imagenUrl) {
        nodos.push(meta('property', 'og:image', imagenUrl));
        if (m.imagen?.ancho) {
          nodos.push(
            meta('property', 'og:image:width', String(m.imagen.ancho)),
          );
        }
        if (m.imagen?.alto) {
          nodos.push(
            meta('property', 'og:image:height', String(m.imagen.alto)),
          );
        }
      }
      nodos.push(
        meta(
          'name',
          'twitter:card',
          imagenUrl ? 'summary_large_image' : 'summary',
        ),
      );
      nodos.push(meta('name', 'twitter:title', m.titulo));
      if (m.descripcion) {
        nodos.push(meta('name', 'twitter:description', m.descripcion));
      }
      if (imagenUrl) nodos.push(meta('name', 'twitter:image', imagenUrl));
    }

    if (m.jsonLd) {
      // `<` escapado para que ningún texto del perfil cierre el `<script>`.
      const json = JSON.stringify(m.jsonLd).replace(/</g, '\\u003c');
      nodos.push(
        `<script ${MARCA} type="application/ld+json">${json}</script>`,
      );
    }

    return nodos.join('\n');
  }

  private urlCanonica(ruta: string): string {
    return ruta === '/' ? `${this.origen()}/` : `${this.origen()}${ruta}`;
  }

  /** `GET /sitemap.xml`: home + proyectos, certificaciones y logros publicados. */
  async generarSitemap(): Promise<string> {
    const version = await this.versionesSitioService.obtenerUltimaPublicada();
    const snapshot = version?.snapshot as unknown as SnapshotSitio | undefined;
    const e = escaparHtml;
    const lastmod = version?.publicado_en
      ? `<lastmod>${version.publicado_en.toISOString()}</lastmod>`
      : '';

    const urls = [`<url><loc>${e(`${this.origen()}/`)}</loc>${lastmod}</url>`];
    if (snapshot) {
      const grupos: [string, { id: string }[] | undefined][] = [
        ['proyecto', snapshot.proyectos],
        ['certificacion', snapshot.certificaciones],
        ['logro', snapshot.logros],
      ];
      for (const [prefijo, items] of grupos) {
        for (const item of items ?? []) {
          urls.push(
            `<url><loc>${e(`${this.origen()}/${prefijo}/${item.id}`)}</loc></url>`,
          );
        }
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  }

  /** `GET /robots.txt`. */
  generarRobots(): string {
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      `Sitemap: ${this.origen()}/sitemap.xml`,
      '',
    ].join('\n');
  }
}
