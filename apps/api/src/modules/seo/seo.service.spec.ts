import { SeoService } from './seo.service';

const ID_P = '11111111-1111-1111-1111-111111111111';
const ID_C = '22222222-2222-2222-2222-222222222222';
const ID_L = '33333333-3333-3333-3333-333333333333';

function snapshotBase() {
  return {
    perfil: {
      nombre_completo: 'Ana <Dev> & "Co"',
      titulo_profesional: 'Ingeniera',
      resumen_bio: 'Bio de Ana. '.repeat(30),
      imagen_perfil: {
        url: '/uploads/ana.jpg',
        tipo: 'imagen',
        ancho: 800,
        alto: 600,
      },
    },
    proyectos: [
      {
        id: ID_P,
        titulo: "Proyecto 'uno'",
        descripcion: 'Descripción del proyecto',
        imagenes: [
          { media: { url: 'https://cdn.example.com/p.png', tipo: 'imagen' } },
        ],
      },
    ],
    certificaciones: [
      {
        id: ID_C,
        nombre: 'Cert',
        institucion: 'Uni',
        logo: { url: '/uploads/l.png', tipo: 'documento' },
      },
    ],
    logros: [{ id: ID_L, titulo: 'Logro', descripcion: 'Desc logro' }],
    redes_sociales: [{ id: 'r', url: 'https://github.com/ana' }],
  };
}

function crear(version: unknown) {
  const versiones = {
    obtenerUltimaPublicada: jest.fn().mockResolvedValue(version),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new SeoService(versiones as any);
}

describe('SeoService (Fase 8, UC-34)', () => {
  const origenOriginal = process.env.FRONTEND_ORIGIN;
  beforeEach(() => {
    process.env.FRONTEND_ORIGIN = 'https://ana.dev';
  });
  afterAll(() => {
    process.env.FRONTEND_ORIGIN = origenOriginal;
  });

  const publicada = () =>
    crear({
      snapshot: snapshotBase(),
      publicado_en: new Date('2026-10-01T10:00:00.000Z'),
    });

  it('sin versión publicada solo emite el título "Portafolio"', async () => {
    const html = await crear(null).generarFragmento('/');
    expect(html).toBe('<title data-meta-estatico>Portafolio</title>');
  });

  it('home: profile, escape HTML, imagen absoluta con dimensiones y JSON-LD', async () => {
    const html = await publicada().generarFragmento('/?utm=1#x');
    expect(html).toContain(
      '<title data-meta-estatico>Ana &lt;Dev&gt; &amp; &quot;Co&quot; — Ingeniera</title>',
    );
    expect(html).toContain('content="profile"');
    expect(html).toContain(
      '<link data-meta-estatico rel="canonical" href="https://ana.dev/">',
    );
    expect(html).toContain('content="https://ana.dev/uploads/ana.jpg"');
    expect(html).toContain('og:image:width" content="800"');
    expect(html).toContain('og:image:height" content="600"');
    expect(html).toContain('twitter:card" content="summary_large_image"');
    expect(html).toContain(
      '<script data-meta-estatico type="application/ld+json">',
    );
    expect(html).toContain('"sameAs":["https://github.com/ana"]');
    // Cada nodo lleva la marca.
    for (const linea of html.split('\n')) {
      expect(linea).toContain('data-meta-estatico');
    }
  });

  it('JSON-LD escapa "<" como \\u003c', async () => {
    const html = await publicada().generarFragmento('/');
    const json = /<script[^>]*>(.*)<\/script>/.exec(html)![1];
    expect(json).not.toContain('<');
    expect(json).toContain('\\u003cDev>');
  });

  it('recorta la descripción a 155 caracteres', async () => {
    const html = await publicada().generarFragmento('/');
    const desc = /name="description" content="([^"]*)"/.exec(html)![1];
    expect(desc.length).toBeLessThanOrEqual(155);
    expect(desc.endsWith('…')).toBe(true);
  });

  it('proyecto: article con título escapado e imagen del primer media', async () => {
    const html = await publicada().generarFragmento(`/proyecto/${ID_P}`);
    expect(html).toContain(
      '<title data-meta-estatico>Proyecto &#39;uno&#39;</title>',
    );
    expect(html).toContain('content="article"');
    expect(html).toContain(`href="https://ana.dev/proyecto/${ID_P}"`);
    expect(html).toContain('og:image" content="https://cdn.example.com/p.png"');
    expect(html).not.toContain('og:image:width');
    expect(html).not.toContain('ld+json');
  });

  it('certificación: título con institución; logo no imagen -> twitter summary', async () => {
    const html = await publicada().generarFragmento(`/certificacion/${ID_C}/`);
    expect(html).toContain('<title data-meta-estatico>Cert — Uni</title>');
    expect(html).toContain('twitter:card" content="summary"');
    expect(html).not.toContain('og:image"');
  });

  it('logro: article', async () => {
    const html = await publicada().generarFragmento(`/logro/${ID_L}`);
    expect(html).toContain('<title data-meta-estatico>Logro</title>');
    expect(html).toContain('content="article"');
  });

  it.each(['/nada', '/proyecto/no-existe', '/proyecto/a/b'])(
    'ruta desconocida %s: noindex y "Página no encontrada"',
    async (ruta) => {
      const html = await publicada().generarFragmento(ruta);
      expect(html).toContain(
        '<title data-meta-estatico>Página no encontrada</title>',
      );
      expect(html).toContain('name="robots" content="noindex"');
      expect(html).not.toContain('canonical');
    },
  );

  it('/admin* : noindex y título del panel sin consultar versiones', async () => {
    const versiones = { obtenerUltimaPublicada: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = await new SeoService(versiones as any).generarFragmento(
      '/admin/editor?panel=tema',
    );
    expect(html).toContain('Panel de administración');
    expect(html).toContain('noindex');
    expect(versiones.obtenerUltimaPublicada).not.toHaveBeenCalled();
  });

  it('sin cabecera trata la ruta como "/"', async () => {
    const html = await publicada().generarFragmento(undefined);
    expect(html).toContain('content="profile"');
  });

  it('sitemap: home con lastmod y una url por entidad; sin versión solo la home', async () => {
    const xml = await publicada().generarSitemap();
    expect(xml).toContain(
      '<loc>https://ana.dev/</loc><lastmod>2026-10-01T10:00:00.000Z</lastmod>',
    );
    expect(xml).toContain(`<loc>https://ana.dev/proyecto/${ID_P}</loc>`);
    expect(xml).toContain(`<loc>https://ana.dev/certificacion/${ID_C}</loc>`);
    expect(xml).toContain(`<loc>https://ana.dev/logro/${ID_L}</loc>`);

    const vacio = await crear(null).generarSitemap();
    expect(vacio.match(/<url>/g)).toHaveLength(1);
  });

  it('robots', () => {
    const txt = crear(null).generarRobots();
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Sitemap: https://ana.dev/sitemap.xml');
  });

  describe('caché de la versión publicada', () => {
    const version = () => ({
      snapshot: snapshotBase(),
      publicado_en: new Date('2026-10-01T10:00:00.000Z'),
    });

    it('lee una sola vez para metadatos y sitemap dentro del TTL', async () => {
      const versiones = {
        obtenerUltimaPublicada: jest.fn().mockResolvedValue(version()),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const servicio = new SeoService(versiones as any);
      await servicio.generarFragmento('/');
      await servicio.generarFragmento('/');
      await servicio.generarSitemap();
      expect(versiones.obtenerUltimaPublicada).toHaveBeenCalledTimes(1);

      servicio.invalidarCache();
      await servicio.generarSitemap();
      expect(versiones.obtenerUltimaPublicada).toHaveBeenCalledTimes(2);
    });

    it('peticiones concurrentes comparten una sola promesa en vuelo', async () => {
      const versiones = {
        obtenerUltimaPublicada: jest.fn(
          () => new Promise((r) => setTimeout(() => r(version()), 10)),
        ),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const servicio = new SeoService(versiones as any);
      await Promise.all([
        servicio.generarFragmento('/'),
        servicio.generarFragmento('/'),
        servicio.generarSitemap(),
      ]);
      expect(versiones.obtenerUltimaPublicada).toHaveBeenCalledTimes(1);
    });

    it('vuelve a leer al vencer el TTL y no cachea los fallos', async () => {
      const ahora = jest.spyOn(Date, 'now');
      ahora.mockReturnValue(1_000);
      const versiones = {
        obtenerUltimaPublicada: jest
          .fn()
          .mockRejectedValueOnce(new Error('bd'))
          .mockResolvedValue(version()),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const servicio = new SeoService(versiones as any);
      await expect(servicio.generarSitemap()).rejects.toThrow('bd');
      await servicio.generarSitemap();
      expect(versiones.obtenerUltimaPublicada).toHaveBeenCalledTimes(2);

      ahora.mockReturnValue(1_000 + 29_000);
      await servicio.generarSitemap();
      expect(versiones.obtenerUltimaPublicada).toHaveBeenCalledTimes(2);
      ahora.mockReturnValue(1_000 + 31_000);
      await servicio.generarSitemap();
      expect(versiones.obtenerUltimaPublicada).toHaveBeenCalledTimes(3);
      ahora.mockRestore();
    });
  });
});
