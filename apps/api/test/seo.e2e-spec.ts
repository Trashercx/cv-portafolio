import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { SeoService } from '../src/modules/seo/seo.service';
import { VersionesSitioService } from '../src/modules/versiones-sitio/versiones-sitio.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * Fase 8, UC-34: `GET /seo/metadatos`, `/sitemap.xml` y `/robots.txt`.
 * Rutas públicas: se usan peticiones sin cookie. Como "la versión publicada
 * vigente" es global, el caso "sin versión publicada" se simula espiando
 * `obtenerUltimaPublicada` en vez de depender del estado de la base.
 */
describe('SEO en servidor (e2e, Fase 8, UC-34)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let perfilOriginal: any;
  let adminId: string;
  let proyectoId: string;
  let versionId: string;
  const sufijo = Date.now();
  const nombre = `Seo & Prueba ${sufijo}`;
  const tituloProyecto = `Proyecto SEO ${sufijo}`;
  const origenOriginal = process.env.FRONTEND_ORIGIN;

  beforeAll(async () => {
    process.env.FRONTEND_ORIGIN = 'https://seo.example.com';
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);

    const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
      where: { email: process.env.ADMIN_EMAIL as string },
    });
    adminId = admin.id;
    perfilOriginal = await prisma.perfil.findUnique({
      where: { usuario_admin_id: admin.id },
    });
  });

  afterAll(async () => {
    if (proyectoId) {
      await prisma.proyecto.deleteMany({ where: { id: proyectoId } });
    }
    if (versionId) {
      await prisma.versionSitio.deleteMany({ where: { id: versionId } });
    }
    if (perfilOriginal) {
      await prisma.perfil.update({
        where: { id: perfilOriginal.id },
        data: {
          nombre_completo: perfilOriginal.nombre_completo,
          titulo_profesional: perfilOriginal.titulo_profesional,
          resumen_bio: perfilOriginal.resumen_bio,
          imagen_perfil_id: perfilOriginal.imagen_perfil_id,
          cv_media_id: perfilOriginal.cv_media_id,
          ubicacion: perfilOriginal.ubicacion,
        },
      });
    } else {
      await prisma.perfil.deleteMany({ where: { usuario_admin_id: adminId } });
    }
    if (origenOriginal === undefined) delete process.env.FRONTEND_ORIGIN;
    else process.env.FRONTEND_ORIGIN = origenOriginal;
    await app.close();
  });

  it('sin versión publicada: 200 con solo <title>Portafolio</title>', async () => {
    // `SeoService` cachea la versión publicada 30 s (Fase 8): se invalida
    // antes y después para no depender del orden de los casos.
    app.get(SeoService).invalidarCache();
    const espia = jest
      .spyOn(app.get(VersionesSitioService), 'obtenerUltimaPublicada')
      .mockResolvedValue(null);
    try {
      const res = await request(app.getHttpServer())
        .get('/seo/metadatos')
        .set('X-Ruta-Publica', '/')
        .expect(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toBe('<title data-meta-estatico>Portafolio</title>');
    } finally {
      espia.mockRestore();
      app.get(SeoService).invalidarCache();
    }
  });

  it('tras publicar: home, detalle de proyecto, sitemap y robots', async () => {
    await agent
      .put('/admin/perfil')
      .send({
        nombre_completo: nombre,
        titulo_profesional: 'Ingeniera SEO',
        resumen_bio: 'Bio de prueba del e2e de SEO.',
        ubicacion: 'Remoto',
      })
      .expect(200);

    const proyecto = await agent
      .post('/admin/proyectos')
      .send({
        titulo: tituloProyecto,
        descripcion: 'Proyecto de prueba del e2e de SEO.',
        fecha_inicio: '2024-01-01',
        estado: 'en_progreso',
        destacado: false,
        orden: 9701,
      })
      .expect(201);
    proyectoId = proyecto.body.id;

    const version = await agent.post('/admin/versiones/publicar').expect(201);
    versionId = version.body.id;
    app.get(SeoService).invalidarCache();

    // Home (con query y hash en la cabecera: solo cuenta el pathname).
    const home = await request(app.getHttpServer())
      .get('/seo/metadatos')
      .set('X-Ruta-Publica', '/?utm_source=x#inicio')
      .expect(200);
    expect(home.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(home.headers['cache-control']).toBe('no-cache');
    expect(home.text).toContain('Seo &amp; Prueba');
    expect(home.text).toContain('property="og:type" content="profile"');
    expect(home.text).toContain('href="https://seo.example.com/"');
    expect(home.text).toContain('type="application/ld+json"');
    expect(home.text).toContain('"@type":"Person"');

    // Sin cabecera equivale a "/".
    const sinCabecera = await request(app.getHttpServer())
      .get('/seo/metadatos')
      .expect(200);
    expect(sinCabecera.text).toContain('og:type" content="profile"');

    const detalle = await request(app.getHttpServer())
      .get('/seo/metadatos')
      .set('X-Ruta-Publica', `/proyecto/${proyectoId}`)
      .expect(200);
    expect(detalle.text).toContain(tituloProyecto);
    expect(detalle.text).toContain('og:type" content="article"');

    const sitemap = await request(app.getHttpServer())
      .get('/sitemap.xml')
      .expect(200);
    expect(sitemap.headers['content-type']).toBe(
      'application/xml; charset=utf-8',
    );
    expect(sitemap.headers['cache-control']).toBe('public, max-age=3600');
    expect(sitemap.text).toContain('<loc>https://seo.example.com/</loc>');
    expect(sitemap.text).toContain(
      `<loc>https://seo.example.com/proyecto/${proyectoId}</loc>`,
    );

    const robots = await request(app.getHttpServer())
      .get('/robots.txt')
      .expect(200);
    expect(robots.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(robots.text).toContain('Disallow: /admin');
    expect(robots.text).toContain(
      'Sitemap: https://seo.example.com/sitemap.xml',
    );
  });

  it('ruta desconocida o id inexistente: 200 con noindex', async () => {
    for (const ruta of ['/no-existe', `/proyecto/${randomUUID()}`]) {
      const res = await request(app.getHttpServer())
        .get('/seo/metadatos')
        .set('X-Ruta-Publica', ruta)
        .expect(200);
      expect(res.text).toContain('Página no encontrada');
      expect(res.text).toContain('name="robots" content="noindex"');
    }
  });

  it('/admin/editor: noindex y título del panel', async () => {
    const res = await request(app.getHttpServer())
      .get('/seo/metadatos')
      .set('X-Ruta-Publica', '/admin/editor?panel=tema')
      .expect(200);
    expect(res.text).toContain('Panel de administración');
    expect(res.text).toContain('name="robots" content="noindex"');
  });
});
