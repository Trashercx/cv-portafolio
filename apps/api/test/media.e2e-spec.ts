import { INestApplication } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * Módulo `media` (prerequisito de UC-02/UC-03/UC-04, ver
 * docs/plan-tecnico.md Sprint 1: la biblioteca completa es UC-09, Sprint 3).
 * Cubre subida vía `POST /admin/media`, protegida por JwtAuthGuard, con el
 * stub local de almacenamiento (LocalMediaStorageService).
 */
describe('Media admin (e2e, soporte de UC-02/UC-03/UC-04)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsCreados: string[] = [];
  const keysCreadas: string[] = [];

  beforeAll(async () => {
    app = await crearAppDePrueba();
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
      .field('carpeta', 'no-declarado')
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
});
