import { INestApplication } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { LocalMediaStorageService } from '../src/modules/media/storage/local-media-storage.service';
import { MEDIA_STORAGE_SERVICE } from '../src/modules/media/storage/media-storage.interface';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

/** Carpetas de la biblioteca (UC-09 ext., Fase 7e). */
describe('Carpetas de media (e2e, Fase 7e, UC-09)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  const carpetasCreadas: string[] = [];
  const mediasCreadas: string[] = [];
  const keys: string[] = [];

  const crearCarpeta = async (nombre: string) => {
    const res = await agent.post('/admin/media/carpetas').send({ nombre });
    if (res.status === 201) carpetasCreadas.push(res.body.id);
    return res;
  };
  const subir = async (campos: Record<string, string> = {}) => {
    let req = agent.post('/admin/media');
    for (const [k, v] of Object.entries(campos)) req = req.field(k, v);
    const res = await req.attach('file', PNG_1X1, 'foto.png');
    if (res.status === 201) {
      mediasCreadas.push(res.body.id);
      keys.push(res.body.s3_key);
    }
    return res;
  };

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
    await prisma.media.deleteMany({ where: { id: { in: mediasCreadas } } });
    await prisma.carpetaMedia.deleteMany({
      where: { id: { in: carpetasCreadas } },
    });
    await Promise.all(
      keys.map((k) =>
        fs.unlink(join(process.cwd(), 'uploads', k)).catch(() => undefined),
      ),
    );
    await app.close();
  });

  it('responde 401 sin cookie', async () => {
    await request(app.getHttpServer()).get('/admin/media/carpetas').expect(401);
    await request(app.getHttpServer())
      .post('/admin/media/mover')
      .send({ ids: [], carpeta_id: null })
      .expect(401);
  });

  it('crea, lista, renombra y rechaza duplicados sin distinguir mayúsculas', async () => {
    const a = await crearCarpeta('  Fotos e2e  ');
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ nombre: 'Fotos e2e', total: 0 });

    const dup = await crearCarpeta('fotos E2E');
    expect(dup.status).toBe(409);
    await agent.post('/admin/media/carpetas').send({ nombre: '' }).expect(400);
    await agent
      .post('/admin/media/carpetas')
      .send({ nombre: 'x', extra: 1 })
      .expect(400);

    const b = await crearCarpeta('Docs e2e');
    expect(b.body.orden).toBeGreaterThan(a.body.orden);
    await agent
      .patch(`/admin/media/carpetas/${b.body.id}`)
      .send({ nombre: 'FOTOS e2e' })
      .expect(409);
    const ren = await agent
      .patch(`/admin/media/carpetas/${b.body.id}`)
      .send({ nombre: 'Docs e2e 2' })
      .expect(200);
    expect(ren.body.nombre).toBe('Docs e2e 2');

    const lista = await agent.get('/admin/media/carpetas').expect(200);
    expect(lista.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: a.body.id, total: 0 }),
      ]),
    );
  });

  it('reordena y responde 404 si falta una carpeta', async () => {
    const x = await crearCarpeta('Orden X e2e');
    const y = await crearCarpeta('Orden Y e2e');
    await agent
      .patch('/admin/media/carpetas/reordenar')
      .send({ ids: [y.body.id, x.body.id] })
      .expect(200);
    const lista = await agent.get('/admin/media/carpetas').expect(200);
    const ids = (lista.body as { id: string }[]).map((c) => c.id);
    expect(ids.indexOf(y.body.id)).toBeLessThan(ids.indexOf(x.body.id));

    await agent
      .patch('/admin/media/carpetas/reordenar')
      .send({ ids: [x.body.id, UUID_INEXISTENTE] })
      .expect(404);
  });

  it('sube a una carpeta, filtra, mueve en lote y borrar la carpeta deja sin carpeta', async () => {
    const c = await crearCarpeta('Lote e2e');
    const m1 = await subir({ carpeta_id: c.body.id });
    expect(m1.status).toBe(201);
    expect(m1.body.carpeta_id).toBe(c.body.id);
    const m2 = await subir();
    expect(m2.body.carpeta_id).toBeNull();

    const sinCarpetaReal = await subir({ carpeta_id: UUID_INEXISTENTE });
    expect(sinCarpetaReal.status).toBe(404);

    const enCarpeta = await agent
      .get(`/admin/media?carpeta_id=${c.body.id}`)
      .expect(200);
    expect((enCarpeta.body as { id: string }[]).map((m) => m.id)).toEqual([
      m1.body.id,
    ]);
    const sin = await agent.get('/admin/media?carpeta_id=ninguna').expect(200);
    const idsSin = (sin.body as { id: string }[]).map((m) => m.id);
    expect(idsSin).toContain(m2.body.id);
    expect(idsSin).not.toContain(m1.body.id);
    await agent.get('/admin/media?carpeta_id=abc').expect(400);

    const mover = await agent
      .post('/admin/media/mover')
      .send({ ids: [m2.body.id, UUID_INEXISTENTE], carpeta_id: c.body.id })
      .expect(201);
    expect(mover.body).toEqual({ movidos: 1 });
    await agent
      .post('/admin/media/mover')
      .send({ ids: [m2.body.id], carpeta_id: UUID_INEXISTENTE })
      .expect(404);

    const lista = await agent.get('/admin/media/carpetas').expect(200);
    const total = (lista.body as { id: string; total: number }[]).find(
      (x) => x.id === c.body.id,
    )?.total;
    expect(total).toBe(2);

    await agent.delete(`/admin/media/carpetas/${c.body.id}`).expect(200);
    await agent.delete(`/admin/media/carpetas/${c.body.id}`).expect(404);
    const tras = await agent.get(`/admin/media/${m1.body.id}`).expect(200);
    expect(tras.body.carpeta_id).toBeNull();
  });
});
