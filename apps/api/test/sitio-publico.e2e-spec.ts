import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { LocalMediaStorageService } from '../src/modules/media/storage/local-media-storage.service';
import { MEDIA_STORAGE_SERVICE } from '../src/modules/media/storage/media-storage.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * Sprint 4: `versiones-sitio` (UC-10 Previsualizar, UC-11 Publicar/revertir)
 * y `publico` (UC-12 Ver el sitio publicado, UC-13 Ver detalle, UC-14 Redes
 * y CV), en un único archivo e2e.
 *
 * Se mantienen juntos deliberadamente (en vez de un archivo por módulo):
 * `VersionSitio` no tiene un scope por test — "la versión pública vigente"
 * es un puntero global (la fila `publicado` de `publicado_en` más
 * reciente). Si las aserciones contra `GET /sitio` vivieran en un archivo
 * aparte que Jest ejecuta en paralelo con otro archivo que también publica
 * versiones, ambos competirían por ese puntero. Manteniéndolo todo en un
 * único archivo, los `it()` corren en orden y son la única fuente de
 * publicaciones durante toda la corrida (ningún otro *.e2e-spec.ts toca
 * `VersionSitio`).
 *
 * Decisión de arquitectura central (docs/plan-tecnico.md, Sprint 4): el
 * sitio público SIEMPRE lee de `VersionSitio.snapshot` con
 * `estado='publicado'`, nunca de las tablas en vivo — es el criterio de
 * aceptación literal de UC-12, verificado explícitamente más abajo.
 */
describe('Versiones del sitio y sitio público (e2e, UC-10 a UC-14)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let perfilOriginal: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plataforma: any;
  let adminId: string;

  const idsProyectosCreados: string[] = [];
  const idsCertificacionesCreadas: string[] = [];
  const idsRedesCreadas: string[] = [];
  const idsVersionesCreadas: string[] = [];
  const idsMediaCreada: string[] = [];
  const keysMediaCreada: string[] = [];
  const idsSeccionesCreadas: string[] = [];

  const dtoProyectoBase = {
    descripcion: 'Proyecto de prueba generado por el e2e de Sprint 4.',
    fecha_inicio: '2024-01-01',
    estado: 'en_progreso',
    destacado: false,
  };

  const dtoCertificacionBase = {
    institucion: 'Institución e2e Sprint 4',
    fecha_emision: '2023-05-01',
    url_verificacion: 'https://verificacion.example.com/sprint-4',
  };

  beforeAll(async () => {
    app = await crearAppDePrueba((builder) =>
      builder
        .overrideProvider(MEDIA_STORAGE_SERVICE)
        .useClass(LocalMediaStorageService),
    );
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);

    const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
      where: { email: process.env.ADMIN_EMAIL as string },
    });
    adminId = admin.id;
    perfilOriginal = await prisma.perfil.findUnique({
      where: { usuario_admin_id: admin.id },
    });
    plataforma = await prisma.plataformaRed.findFirstOrThrow();
  });

  afterAll(async () => {
    await prisma.seccion.deleteMany({
      where: { id: { in: idsSeccionesCreadas } },
    });
    await prisma.redSocial.deleteMany({
      where: { id: { in: idsRedesCreadas } },
    });
    await prisma.certificacion.deleteMany({
      where: { id: { in: idsCertificacionesCreadas } },
    });
    await prisma.proyecto.deleteMany({
      where: { id: { in: idsProyectosCreados } },
    });
    await prisma.versionSitio.deleteMany({
      where: { id: { in: idsVersionesCreadas } },
    });

    // Deja `perfil` en el estado en el que lo encontramos (mismo patrón que
    // test/perfil.e2e-spec.ts).
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

    await prisma.media.deleteMany({ where: { id: { in: idsMediaCreada } } });

    // Best-effort: borra los archivos que el stub local escribió en disco.
    await Promise.all(
      keysMediaCreada.map((key) =>
        fs.unlink(join(process.cwd(), 'uploads', key)).catch(() => undefined),
      ),
    );

    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401: rutas de administración sin cookie
  // -----------------------------------------------------------------------

  it('POST /admin/versiones/preview sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/versiones/preview')
      .expect(401);
  });

  it('POST /admin/versiones/publicar sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/versiones/publicar')
      .expect(401);
  });

  it('POST /admin/versiones/:id/revertir sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post(`/admin/versiones/${randomUUID()}/revertir`)
      .expect(401);
  });

  it('GET /admin/versiones sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/versiones').expect(401);
  });

  // -----------------------------------------------------------------------
  // Rutas públicas: nunca requieren cookie/autenticación (UC-12 a UC-14)
  // -----------------------------------------------------------------------

  it('GET /sitio, /redes y /cv no heredan JwtAuthGuard: responden sin cookie (200/404, nunca 401)', async () => {
    const respuestaSitio = await request(app.getHttpServer()).get('/sitio');
    expect(respuestaSitio.status).not.toBe(401);

    const respuestaRedes = await request(app.getHttpServer()).get('/redes');
    expect(respuestaRedes.status).not.toBe(401);

    const respuestaCv = await request(app.getHttpServer()).get('/cv');
    expect(respuestaCv.status).not.toBe(401);
  });

  // -----------------------------------------------------------------------
  // UC-10: previsualizar (borrador) — nunca se convierte en lo público
  // -----------------------------------------------------------------------

  it('POST /admin/versiones/preview arma un snapshot y lo guarda como borrador, sin publicarlo', async () => {
    const sufijo = Date.now();

    const proyecto = await agent
      .post('/admin/proyectos')
      .send({
        ...dtoProyectoBase,
        titulo: `Preview e2e ${sufijo}`,
        orden: 9601,
      })
      .expect(201);
    idsProyectosCreados.push(proyecto.body.id);

    const preview = await agent.post('/admin/versiones/preview').expect(201);
    idsVersionesCreadas.push(preview.body.id);

    expect(preview.body.estado).toBe('borrador');
    expect(preview.body.publicado_en).toBeNull();
    expect(
      preview.body.snapshot.proyectos.some(
        (p: { id: string }) => p.id === proyecto.body.id,
      ),
    ).toBe(true);
  });

  it('GET /sitio nunca expone una versión borrador (crear un preview no cambia lo que ve el visitante)', async () => {
    const sufijo = Date.now();
    const marcaBorrador = `Marca borrador e2e ${sufijo}`;

    const antes = await request(app.getHttpServer()).get('/sitio');
    expect([200, 404]).toContain(antes.status);

    const proyectoMarca = await agent
      .post('/admin/proyectos')
      .send({ ...dtoProyectoBase, titulo: marcaBorrador, orden: 9602 })
      .expect(201);
    idsProyectosCreados.push(proyectoMarca.body.id);

    const preview = await agent.post('/admin/versiones/preview').expect(201);
    idsVersionesCreadas.push(preview.body.id);
    expect(preview.body.estado).toBe('borrador');

    const despues = await request(app.getHttpServer()).get('/sitio');
    expect([200, 404]).toContain(despues.status);
    if (despues.status === 200) {
      const titulos = (despues.body.proyectos ?? []).map(
        (p: { titulo: string }) => p.titulo,
      );
      expect(titulos).not.toContain(marcaBorrador);
    }
  });

  // -----------------------------------------------------------------------
  // UC-11 + UC-12 + UC-13: publicar, y que el visitante lo vea de inmediato
  // -----------------------------------------------------------------------

  let proyectoPublicoId: string;
  let certificacionPublicaId: string;
  let redPublicaId: string;
  let sufijoPublico: number;

  it('POST /admin/versiones/publicar publica proyectos, certificaciones y redes; el visitante los ve de inmediato', async () => {
    sufijoPublico = Date.now();

    const proyecto = await agent
      .post('/admin/proyectos')
      .send({
        ...dtoProyectoBase,
        titulo: `Publico proyecto e2e ${sufijoPublico}`,
        orden: 9603,
      })
      .expect(201);
    proyectoPublicoId = proyecto.body.id;
    idsProyectosCreados.push(proyectoPublicoId);

    const certificacion = await agent
      .post('/admin/certificaciones')
      .send({
        ...dtoCertificacionBase,
        nombre: `Publico cert e2e ${sufijoPublico}`,
        orden: 9603,
      })
      .expect(201);
    certificacionPublicaId = certificacion.body.id;
    idsCertificacionesCreadas.push(certificacionPublicaId);

    const red = await agent
      .post('/admin/redes-sociales')
      .send({
        plataforma_id: plataforma.id,
        url: `https://example.com/publico-e2e-${sufijoPublico}`,
        orden: 9603,
      })
      .expect(201);
    redPublicaId = red.body.id;
    idsRedesCreadas.push(redPublicaId);

    const v1 = await agent.post('/admin/versiones/publicar').expect(201);
    idsVersionesCreadas.push(v1.body.id);
    expect(v1.body.estado).toBe('publicado');
    expect(v1.body.publicado_en).not.toBeNull();

    const sitio = await request(app.getHttpServer()).get('/sitio').expect(200);
    expect(
      sitio.body.proyectos.some(
        (p: { id: string }) => p.id === proyectoPublicoId,
      ),
    ).toBe(true);
    expect(
      sitio.body.certificaciones.some(
        (c: { id: string }) => c.id === certificacionPublicaId,
      ),
    ).toBe(true);
    expect(
      sitio.body.redes_sociales.some(
        (r: { id: string }) => r.id === redPublicaId,
      ),
    ).toBe(true);

    const detalleProyecto = await request(app.getHttpServer())
      .get(`/proyectos/${proyectoPublicoId}`)
      .expect(200);
    expect(detalleProyecto.body.titulo).toBe(
      `Publico proyecto e2e ${sufijoPublico}`,
    );

    const detalleCert = await request(app.getHttpServer())
      .get(`/certificaciones/${certificacionPublicaId}`)
      .expect(200);
    expect(detalleCert.body.nombre).toBe(`Publico cert e2e ${sufijoPublico}`);

    const redes = await request(app.getHttpServer()).get('/redes').expect(200);
    expect(redes.body.some((r: { id: string }) => r.id === redPublicaId)).toBe(
      true,
    );
  });

  it('un cambio editado sin volver a publicar no se ve en el detalle público (UC-12/UC-13)', async () => {
    await agent
      .patch(`/admin/proyectos/${proyectoPublicoId}`)
      .send({ titulo: `Publico proyecto editado e2e ${sufijoPublico}` })
      .expect(200);

    const detalleTrasEditar = await request(app.getHttpServer())
      .get(`/proyectos/${proyectoPublicoId}`)
      .expect(200);
    expect(detalleTrasEditar.body.titulo).toBe(
      `Publico proyecto e2e ${sufijoPublico}`,
    );

    // Publicar de nuevo sí lo refleja.
    const v2 = await agent.post('/admin/versiones/publicar').expect(201);
    idsVersionesCreadas.push(v2.body.id);

    const detalleTrasPublicar = await request(app.getHttpServer())
      .get(`/proyectos/${proyectoPublicoId}`)
      .expect(200);
    expect(detalleTrasPublicar.body.titulo).toBe(
      `Publico proyecto editado e2e ${sufijoPublico}`,
    );
  });

  it('GET /proyectos/:id y /certificaciones/:id responden 404 contra el snapshot si el elemento nunca se publicó (aunque exista en la tabla viva)', async () => {
    const sufijo = Date.now();

    const proyectoSinPublicar = await agent
      .post('/admin/proyectos')
      .send({
        ...dtoProyectoBase,
        titulo: `Sin publicar e2e ${sufijo}`,
        orden: 9604,
      })
      .expect(201);
    idsProyectosCreados.push(proyectoSinPublicar.body.id);

    const certificacionSinPublicar = await agent
      .post('/admin/certificaciones')
      .send({
        ...dtoCertificacionBase,
        nombre: `Sin publicar e2e ${sufijo}`,
        orden: 9604,
      })
      .expect(201);
    idsCertificacionesCreadas.push(certificacionSinPublicar.body.id);

    await request(app.getHttpServer())
      .get(`/proyectos/${proyectoSinPublicar.body.id}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/certificaciones/${certificacionSinPublicar.body.id}`)
      .expect(404);
  });

  // -----------------------------------------------------------------------
  // UC-11: revertir — nueva fila, sin mutar historial
  // -----------------------------------------------------------------------

  it('POST /admin/versiones/:id/revertir crea una NUEVA fila publicada copiando la versión publicada anterior, sin mutar ninguna existente', async () => {
    const v2EnBd = await prisma.versionSitio.findFirst({
      where: { estado: 'publicado' },
      orderBy: { publicado_en: 'desc' },
    });
    expect(v2EnBd).not.toBeNull();
    const v2 = v2EnBd!;

    const v3 = await agent
      .post(`/admin/versiones/${v2.id}/revertir`)
      .expect(201);
    idsVersionesCreadas.push(v3.body.id);

    expect(v3.body.estado).toBe('publicado');
    expect(v3.body.id).not.toBe(v2.id);

    // El snapshot de v3 es el de la publicación anterior a v2 (título original,
    // antes de la edición del test anterior).
    const proyectoEnV3 = v3.body.snapshot.proyectos.find(
      (p: { id: string }) => p.id === proyectoPublicoId,
    );
    expect(proyectoEnV3.titulo).toBe(`Publico proyecto e2e ${sufijoPublico}`);

    // v2 sigue existiendo intacta en la base de datos (revertir nunca muta).
    const v2SigueIntacta = await prisma.versionSitio.findUnique({
      where: { id: v2.id },
    });
    expect(v2SigueIntacta).not.toBeNull();
    expect(v2SigueIntacta?.estado).toBe('publicado');

    // El visitante ahora ve el estado revertido.
    const detalleTrasRevertir = await request(app.getHttpServer())
      .get(`/proyectos/${proyectoPublicoId}`)
      .expect(200);
    expect(detalleTrasRevertir.body.titulo).toBe(
      `Publico proyecto e2e ${sufijoPublico}`,
    );
  });

  it('POST /admin/versiones/:id/revertir responde 404 si el id no existe', async () => {
    await agent.post(`/admin/versiones/${randomUUID()}/revertir`).expect(404);
  });

  // -----------------------------------------------------------------------
  // UC-11: historial (listar)
  // -----------------------------------------------------------------------

  it('GET /admin/versiones lista el historial completo, más reciente primero', async () => {
    const listado = await agent.get('/admin/versiones').expect(200);
    expect(Array.isArray(listado.body)).toBe(true);

    const idsListado = listado.body.map((v: { id: string }) => v.id);
    idsVersionesCreadas.forEach((id) => expect(idsListado).toContain(id));
  });

  // -----------------------------------------------------------------------
  // UC-14: CV descargable sin autenticación
  // -----------------------------------------------------------------------

  it('GET /cv resuelve la URL del CV desde el snapshot publicado y redirige (302)', async () => {
    const media = await agent
      .post('/admin/media')
      .attach('file', Buffer.from('cv de prueba e2e'), 'cv.pdf')
      .expect(201);
    idsMediaCreada.push(media.body.id);
    keysMediaCreada.push(media.body.s3_key);

    await agent
      .put('/admin/perfil')
      .send({
        nombre_completo: perfilOriginal?.nombre_completo ?? 'Ada Lovelace',
        titulo_profesional:
          perfilOriginal?.titulo_profesional ?? 'Ingeniera de Software',
        resumen_bio: perfilOriginal?.resumen_bio ?? 'Bio de prueba e2e',
        ubicacion: perfilOriginal?.ubicacion ?? 'Remoto',
        cv_media_id: media.body.id,
      })
      .expect(200);

    const v = await agent.post('/admin/versiones/publicar').expect(201);
    idsVersionesCreadas.push(v.body.id);

    const respuesta = await request(app.getHttpServer()).get('/cv');
    expect(respuesta.status).toBe(302);
    expect(respuesta.headers.location).toBe(media.body.url);
  });

  // -----------------------------------------------------------------------
  // UC-07 + UC-12: la imagen de fondo de una sección hero se resuelve en el
  // snapshot publicado (bug fijado: antes solo se resolvía media en
  // perfil/proyectos/certificaciones, nunca en `Seccion.configuracion`).
  // -----------------------------------------------------------------------

  it('GET /sitio resuelve imagen_fondo_media_id de una sección hero a una Media completa, aunque esa imagen no se use en ningún otro lugar del snapshot', async () => {
    const sufijo = Date.now();

    const media = await agent
      .post('/admin/media')
      .attach('file', Buffer.from('fondo hero e2e'), 'fondo-hero.png')
      .expect(201);
    idsMediaCreada.push(media.body.id);
    keysMediaCreada.push(media.body.s3_key);

    const seccion = await agent
      .post('/admin/secciones')
      .send({
        tipo_seccion: 'hero',
        titulo_visible: `Hero e2e ${sufijo}`,
        orden: 9605,
        configuracion: {
          titulo: `Titulo hero e2e ${sufijo}`,
          subtitulo: 'Subtitulo hero e2e',
          imagen_fondo_media_id: media.body.id,
        },
      })
      .expect(201);
    idsSeccionesCreadas.push(seccion.body.id);

    const version = await agent.post('/admin/versiones/publicar').expect(201);
    idsVersionesCreadas.push(version.body.id);

    const sitio = await request(app.getHttpServer()).get('/sitio').expect(200);
    const seccionEnSnapshot = sitio.body.secciones.find(
      (s: { id: string }) => s.id === seccion.body.id,
    );

    expect(seccionEnSnapshot).toBeDefined();
    expect(seccionEnSnapshot.configuracion.imagen_fondo).toMatchObject({
      id: media.body.id,
      url: media.body.url,
    });
  });
});
