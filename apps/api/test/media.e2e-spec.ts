import { INestApplication } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { sharp } from '../src/modules/media/sharp';
import { PrismaService } from '../src/prisma/prisma.service';
import { LocalMediaStorageService } from '../src/modules/media/storage/local-media-storage.service';
import { MEDIA_STORAGE_SERVICE } from '../src/modules/media/storage/media-storage.interface';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * Módulo `media` (UC-02/UC-03/UC-04 dependen de él como FK; biblioteca
 * completa es UC-09, Sprint 3). El provider por defecto de `MediaModule` es
 * `S3MediaStorageService` (sube a S3 real), así que aquí se sobreescribe con
 * `LocalMediaStorageService` (guarda en disco) para que ningún test le
 * pegue a S3 real ni dependa de red/credenciales de AWS.
 */
describe('Media admin (e2e, UC-02/UC-03/UC-04 + biblioteca UC-09)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsCreados: string[] = [];
  const keysCreadas: string[] = [];

  beforeAll(async () => {
    app = await crearAppDePrueba((builder) =>
      builder
        .overrideProvider(MEDIA_STORAGE_SERVICE)
        .useClass(LocalMediaStorageService),
    );
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    await prisma.media.deleteMany({ where: { id: { in: idsCreados } } });

    // Best-effort: borra los archivos que el stub local escribió en disco.
    await Promise.all(
      keysCreadas.map((key) =>
        fs.unlink(join(process.cwd(), 'uploads', key)).catch(() => undefined),
      ),
    );

    await app.close();
  });

  it('POST /admin/media sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/media')
      .attach('file', Buffer.from('contenido de prueba'), 'prueba.txt')
      .expect(401);
  });

  it('POST /admin/media rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/media')
      .field('alt_text', 'texto alternativo')
      .field('campo_invalido', 'no-declarado')
      .attach('file', Buffer.from('contenido de prueba'), 'prueba.txt')
      .expect(400);
  });

  it('POST /admin/media rechaza un valor de "carpeta" fuera del catálogo válido', async () => {
    await agent
      .post('/admin/media')
      .field('carpeta', 'no-es-una-carpeta-valida')
      .attach('file', Buffer.from('contenido de prueba'), 'prueba.txt')
      .expect(400);
  });

  it('POST /admin/media sin archivo responde 400', async () => {
    await agent
      .post('/admin/media')
      .field('alt_text', 'sin archivo adjunto')
      .expect(400);
  });

  it('sube un archivo y lo persiste en Media con la metadata del DTO', async () => {
    const respuesta = await agent
      .post('/admin/media')
      .field('alt_text', 'Foto de prueba e2e')
      .field('tipo', 'imagen')
      .attach('file', Buffer.from('contenido de prueba e2e'), 'foto.png')
      .expect(201);

    expect(respuesta.body).toMatchObject({
      tipo: 'imagen',
      alt_text: 'Foto de prueba e2e',
    });
    expect(respuesta.body.url).toEqual(expect.any(String));
    expect(respuesta.body.s3_key).toEqual(expect.any(String));

    idsCreados.push(respuesta.body.id);
    keysCreadas.push(respuesta.body.s3_key);

    const enBaseDeDatos = await prisma.media.findUnique({
      where: { id: respuesta.body.id },
    });
    expect(enBaseDeDatos).toMatchObject({
      tipo: 'imagen',
      alt_text: 'Foto de prueba e2e',
    });
  });

  it('infiere el tipo a partir del mimetype cuando no se indica en el DTO', async () => {
    const respuesta = await agent
      .post('/admin/media')
      .attach('file', Buffer.from('%PDF-1.4 contenido de prueba'), 'cv.pdf')
      .expect(201);

    expect(respuesta.body.tipo).toBe('pdf');

    idsCreados.push(respuesta.body.id);
    keysCreadas.push(respuesta.body.s3_key);
  });

  // ---------------------------------------------------------------------
  // UC-09: biblioteca multimedia completa
  // ---------------------------------------------------------------------

  describe('biblioteca (UC-09)', () => {
    it('GET /admin/media sin cookie responde 401', async () => {
      await request(app.getHttpServer()).get('/admin/media').expect(401);
    });

    it('GET /admin/media lista y filtra por tipo', async () => {
      const subida = await agent
        .post('/admin/media')
        .field('tipo', 'imagen')
        .attach('file', Buffer.from('imagen biblioteca'), 'biblioteca.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      const listaCompleta = await agent.get('/admin/media').expect(200);
      expect(
        listaCompleta.body.some((m: { id: string }) => m.id === subida.body.id),
      ).toBe(true);

      const listaFiltrada = await agent
        .get('/admin/media')
        .query({ tipo: 'imagen' })
        .expect(200);
      expect(
        listaFiltrada.body.every((m: { tipo: string }) => m.tipo === 'imagen'),
      ).toBe(true);
      expect(
        listaFiltrada.body.some((m: { id: string }) => m.id === subida.body.id),
      ).toBe(true);
    });

    it('PATCH /admin/media/:id edita el alt_text', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', Buffer.from('editable'), 'editable.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      const actualizado = await agent
        .patch(`/admin/media/${subida.body.id}`)
        .send({ alt_text: 'Texto alternativo editado' })
        .expect(200);

      expect(actualizado.body.alt_text).toBe('Texto alternativo editado');
    });

    it('PATCH /admin/media/:id rechaza campos fuera del DTO', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', Buffer.from('rechazo'), 'rechazo.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      await agent
        .patch(`/admin/media/${subida.body.id}`)
        .send({ url: 'https://otra-url.example.com/hack.png' })
        .expect(400);
    });

    it('DELETE /admin/media/:id borra un archivo que no está en uso', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', Buffer.from('borrable'), 'borrable.png')
        .expect(201);
      keysCreadas.push(subida.body.s3_key);

      await agent.delete(`/admin/media/${subida.body.id}`).expect(200);

      const enBaseDeDatos = await prisma.media.findUnique({
        where: { id: subida.body.id },
      });
      expect(enBaseDeDatos).toBeNull();
    });

    it('DELETE /admin/media/:id responde 409 si el archivo está referenciado en un proyecto', async () => {
      const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
        where: { email: process.env.ADMIN_EMAIL },
      });

      const subida = await agent
        .post('/admin/media')
        .attach('file', Buffer.from('en-uso'), 'en-uso.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      const proyecto = await prisma.proyecto.create({
        data: {
          usuario_admin_id: admin.id,
          titulo: `Proyecto media e2e ${Date.now()}`,
          descripcion: 'Proyecto de prueba para el chequeo de "usado en"',
          fecha_inicio: new Date('2024-01-01'),
          estado: 'en-progreso',
          orden: 9999,
        },
      });

      await prisma.proyectoImagen.create({
        data: { proyecto_id: proyecto.id, media_id: subida.body.id, orden: 1 },
      });

      await agent.delete(`/admin/media/${subida.body.id}`).expect(409);

      // Limpieza: primero la relación, luego el proyecto (Media queda para el afterAll).
      await prisma.proyectoImagen.deleteMany({
        where: { proyecto_id: proyecto.id },
      });
      await prisma.proyecto.delete({ where: { id: proyecto.id } });
    });

    it('PATCH /admin/media/:id/reemplazar mantiene el mismo id y actualiza url/s3_key', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', Buffer.from('version original'), 'original.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      const reemplazo = await agent
        .patch(`/admin/media/${subida.body.id}/reemplazar`)
        .attach('file', Buffer.from('version nueva'), 'nueva.png')
        .expect(200);

      expect(reemplazo.body.id).toBe(subida.body.id);
      expect(reemplazo.body.s3_key).not.toBe(subida.body.s3_key);
      keysCreadas.push(reemplazo.body.s3_key);

      const enBaseDeDatos = await prisma.media.findUnique({
        where: { id: subida.body.id },
      });
      expect(enBaseDeDatos?.s3_key).toBe(reemplazo.body.s3_key);
    });

    it('PATCH /admin/media/:id/reemplazar sin archivo responde 400', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', Buffer.from('sin-reemplazo'), 'sin-reemplazo.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      await agent
        .patch(`/admin/media/${subida.body.id}/reemplazar`)
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------
  // Fase 8 (UC-34, ext. UC-09): variantes responsive webp/avif
  // ---------------------------------------------------------------------

  describe('variantes responsive (Fase 8, UC-34)', () => {
    const pngReal = () =>
      sharp({
        create: {
          width: 1300,
          height: 800,
          channels: 3,
          background: '#336699',
        },
      })
        .png()
        .toBuffer();

    const claves = (variantes: { formato: string; ancho: number }[]) =>
      variantes.map((v) => `${v.formato}-${v.ancho}`).sort();

    it('POST /admin/media de un PNG de 1300x800 devuelve variantes 640 y 1024 en webp y avif', async () => {
      const inicio = Date.now();
      const respuesta = await agent
        .post('/admin/media')
        .attach('file', await pngReal(), 'grande.png')
        .expect(201);
      // eslint-disable-next-line no-console
      console.log(`Variantes generadas en ${Date.now() - inicio} ms`);
      idsCreados.push(respuesta.body.id);
      keysCreadas.push(respuesta.body.s3_key);

      expect(claves(respuesta.body.variantes)).toEqual([
        'avif-1024',
        'avif-640',
        'webp-1024',
        'webp-640',
      ]);
      expect(respuesta.body.variantes[0]).toEqual({
        formato: expect.any(String),
        ancho: 640,
        alto: 394,
        url: expect.any(String),
      });

      const enDb = await prisma.mediaVariante.findMany({
        where: { media_id: respuesta.body.id },
      });
      keysCreadas.push(...enDb.map((v) => v.s3_key));
      expect(enDb).toHaveLength(4);
    });

    it('una imagen que no es raster (svg) se sube sin variantes y sin fallar', async () => {
      const respuesta = await agent
        .post('/admin/media')
        .attach(
          'file',
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
          { filename: 'logo.svg', contentType: 'image/svg+xml' },
        )
        .expect(201);
      idsCreados.push(respuesta.body.id);
      keysCreadas.push(respuesta.body.s3_key);

      expect(respuesta.body.variantes).toEqual([]);
    });

    it('POST /admin/media/:id/variantes regenera y POST /admin/media/variantes/regenerar responde la forma del contrato', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', await pngReal(), 'regenerar.png')
        .expect(201);
      idsCreados.push(subida.body.id);
      keysCreadas.push(subida.body.s3_key);

      // Simula una imagen anterior a la Fase 8: sin variantes.
      await prisma.mediaVariante.deleteMany({
        where: { media_id: subida.body.id },
      });

      const faltantes = await agent
        .post('/admin/media/variantes/regenerar')
        .expect(201);
      expect(faltantes.body).toEqual({
        procesadas: expect.any(Number),
        omitidas: expect.any(Number),
        errores: expect.any(Array),
      });
      expect(faltantes.body.procesadas).toBeGreaterThanOrEqual(1);

      const individual = await agent
        .post(`/admin/media/${subida.body.id}/variantes`)
        .expect(201);
      expect(individual.body).toEqual({ generadas: 4, omitida: false });

      const enDb = await prisma.mediaVariante.findMany({
        where: { media_id: subida.body.id },
      });
      keysCreadas.push(...enDb.map((v) => v.s3_key));
      expect(enDb).toHaveLength(4);

      await agent
        .post('/admin/media/00000000-0000-4000-8000-000000000000/variantes')
        .expect(404);
    });

    it('DELETE /admin/media/:id borra las variantes en cascada', async () => {
      const subida = await agent
        .post('/admin/media')
        .attach('file', await pngReal(), 'cascada.png')
        .expect(201);
      expect(subida.body.variantes).toHaveLength(4);

      await agent.delete(`/admin/media/${subida.body.id}`).expect(200);

      expect(
        await prisma.mediaVariante.count({
          where: { media_id: subida.body.id },
        }),
      ).toBe(0);
    });
  });

  describe('búsqueda, usos y borrado en lote (Fase 7d, UC-09)', () => {
    const subir = async (alt: string, nombre: string) => {
      const r = await agent
        .post('/admin/media')
        .field('alt_text', alt)
        .attach('file', Buffer.from(`contenido ${nombre}`), nombre)
        .expect(201);
      idsCreados.push(r.body.id);
      keysCreadas.push(r.body.s3_key);
      return r.body as { id: string; s3_key: string };
    };

    it('GET /admin/media?q= busca sin distinguir mayúsculas y ?orden= se valida', async () => {
      const marca = `zq${Date.now()}`;
      const a = await subir(`Alfa ${marca.toUpperCase()}`, 'lote-a.png');
      const b = await subir(`Beta ${marca}`, 'lote-b.png');

      const res = await agent.get(`/admin/media?q=${marca}`).expect(200);
      expect(res.body.map((m: { id: string }) => m.id).sort()).toEqual(
        [a.id, b.id].sort(),
      );
      expect(res.body[0]).toHaveProperty('variantes');

      const nombre = await agent
        .get(`/admin/media?q=${marca}&orden=nombre`)
        .expect(200);
      expect(nombre.body.map((m: { id: string }) => m.id)).toEqual([
        a.id,
        b.id,
      ]);

      const antiguo = await agent
        .get(`/admin/media?q=${marca}&orden=antiguo`)
        .expect(200);
      expect(antiguo.body[0].id).toBe(a.id);

      await agent.get('/admin/media?orden=raro').expect(400);
    });

    it('GET /admin/media/usos refleja el logo de una certificación y omite la libre', async () => {
      const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
        where: { email: process.env.ADMIN_EMAIL },
      });
      const usada = await subir('logo usos', 'usos-a.png');
      const libre = await subir('libre usos', 'usos-b.png');
      const cert = await prisma.certificacion.create({
        data: {
          usuario_admin_id: admin.id,
          nombre: `Cert usos ${Date.now()}`,
          institucion: 'Inst',
          fecha_emision: new Date('2024-01-01'),
          url_verificacion: 'https://example.com/v',
          logo_media_id: usada.id,
          orden: 9999,
        },
      });

      try {
        await request(app.getHttpServer()).get('/admin/media/usos').expect(401);
        const res = await agent.get('/admin/media/usos').expect(200);
        expect(res.body[usada.id]).toEqual([
          { tipo: 'certificacion', id: cert.id, nombre: cert.nombre },
        ]);
        expect(res.body[libre.id]).toBeUndefined();
      } finally {
        await prisma.certificacion.delete({ where: { id: cert.id } });
      }
    });

    it('POST /admin/media/eliminar-lote elimina libres y omite en uso e inexistentes', async () => {
      const admin = await prisma.usuarioAdmin.findUniqueOrThrow({
        where: { email: process.env.ADMIN_EMAIL },
      });
      const enUso = await subir('lote en uso', 'lote-uso.png');
      const libre = await subir('lote libre', 'lote-libre.png');
      const fantasma = '00000000-0000-4000-8000-000000000001';
      const cert = await prisma.certificacion.create({
        data: {
          usuario_admin_id: admin.id,
          nombre: `Cert lote ${Date.now()}`,
          institucion: 'Inst',
          fecha_emision: new Date('2024-01-01'),
          url_verificacion: 'https://example.com/v',
          logo_media_id: enUso.id,
          orden: 9999,
        },
      });

      try {
        await agent
          .post('/admin/media/eliminar-lote')
          .send({ ids: [] })
          .expect(400);
        await agent
          .post('/admin/media/eliminar-lote')
          .send({ ids: ['no-uuid'] })
          .expect(400);

        const res = await agent
          .post('/admin/media/eliminar-lote')
          .send({ ids: [enUso.id, libre.id, fantasma] })
          .expect(201);

        expect(res.body.eliminados).toEqual([libre.id]);
        expect(res.body.omitidos).toHaveLength(2);
        expect(
          res.body.omitidos.find((o: { id: string }) => o.id === enUso.id)
            .motivo,
        ).toContain(cert.nombre);
        expect(
          res.body.omitidos.find((o: { id: string }) => o.id === fantasma)
            .motivo,
        ).toBe('no existe');
        expect(
          await prisma.media.findUnique({ where: { id: libre.id } }),
        ).toBeNull();
        expect(
          await prisma.media.findUnique({ where: { id: enUso.id } }),
        ).not.toBeNull();
      } finally {
        await prisma.certificacion.delete({ where: { id: cert.id } });
      }
    });
  });
});
