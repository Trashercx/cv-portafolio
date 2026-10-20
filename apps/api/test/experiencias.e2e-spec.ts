import { INestApplication } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { sharp } from '../src/modules/media/sharp';
import { LocalMediaStorageService } from '../src/modules/media/storage/local-media-storage.service';
import { MEDIA_STORAGE_SERVICE } from '../src/modules/media/storage/media-storage.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-19 (experiencia laboral, Fase 7l), e2e contra la base real.
 */
describe('Experiencias (e2e, UC-19)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const sufijo = Date.now();
  const idsExperiencias: string[] = [];
  const idsMedia: string[] = [];
  const keysMedia: string[] = [];
  const idsVersiones: string[] = [];
  const nombresTecnologia = [`E2E-Exp-A-${sufijo}`, `E2E-Exp-B-${sufijo}`];

  const base = {
    empresa: 'Acme e2e',
    cargo: 'Desarrolladora',
    descripcion: 'Trabajo de prueba',
    fecha_inicio: '2021-02-01',
    modalidad: 'hibrido',
  };

  async function crear(extra: Record<string, unknown> = {}) {
    const r = await agent
      .post('/admin/experiencias')
      .send({ ...base, ...extra })
      .expect(201);
    idsExperiencias.push(r.body.id);
    return r.body;
  }

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
    await prisma.versionSitio.deleteMany({
      where: { id: { in: idsVersiones } },
    });
    await prisma.experienciaLaboral.deleteMany({
      where: { id: { in: idsExperiencias } },
    });
    await prisma.tecnologia.deleteMany({
      where: { nombre: { in: nombresTecnologia } },
    });
    await prisma.media.deleteMany({ where: { id: { in: idsMedia } } });
    await Promise.all(
      keysMedia.map((key) =>
        fs.unlink(join(process.cwd(), 'uploads', key)).catch(() => undefined),
      ),
    );
    await app.close();
  });

  it.each([
    ['get', '/admin/experiencias'],
    ['post', '/admin/experiencias'],
    ['patch', '/admin/experiencias/reordenar'],
    ['patch', '/admin/experiencias/5f0c1c0e-6a5a-4a43-9d8e-0d8f6a5b4c3d'],
    ['delete', '/admin/experiencias/5f0c1c0e-6a5a-4a43-9d8e-0d8f6a5b4c3d'],
  ])('401 sin cookie: %s %s', async (metodo, ruta) => {
    await (
      request(app.getHttpServer()) as never as Record<
        string,
        (r: string) => request.Test
      >
    )
      [metodo](ruta)
      .expect(401);
  });

  it('CRUD completo con tecnologías en el catálogo y aplanadas', async () => {
    const creada = await crear({
      ubicacion: 'Lima',
      url_empresa: 'https://example.com',
      tecnologias: nombresTecnologia,
    });
    expect(creada).toMatchObject({
      empresa: 'Acme e2e',
      modalidad: 'hibrido',
      fecha_fin: null,
      visible: true,
      logo: null,
    });
    expect(creada.tecnologias.map((t: { nombre: string }) => t.nombre)).toEqual(
      nombresTecnologia,
    );
    expect(creada.tecnologias[0]).toEqual({
      id: expect.any(String),
      nombre: nombresTecnologia[0],
    });

    const lista = await agent.get('/admin/experiencias').expect(200);
    expect(lista.body.some((e: { id: string }) => e.id === creada.id)).toBe(
      true,
    );
    const ordenes = lista.body.map((e: { orden: number }) => e.orden);
    expect([...ordenes].sort((a, b) => a - b)).toEqual(ordenes);

    const act = await agent
      .patch(`/admin/experiencias/${creada.id}`)
      .send({
        cargo: 'Lead',
        fecha_fin: '2023-06-30',
        tecnologias: [nombresTecnologia[1]],
      })
      .expect(200);
    expect(act.body.cargo).toBe('Lead');
    expect(act.body.fecha_fin).toBe('2023-06-30T00:00:00.000Z');
    expect(act.body.tecnologias).toHaveLength(1);

    // null vuelve a "puesto actual"
    const actual = await agent
      .patch(`/admin/experiencias/${creada.id}`)
      .send({ fecha_fin: null })
      .expect(200);
    expect(actual.body.fecha_fin).toBeNull();

    await agent.get(`/admin/experiencias/${creada.id}`).expect(200);
    await agent.delete(`/admin/experiencias/${creada.id}`).expect(200);
    await agent.get(`/admin/experiencias/${creada.id}`).expect(404);
    // El catálogo conserva las tecnologías (no se borran con el puesto).
    expect(
      await prisma.tecnologia.count({
        where: { nombre: { in: nombresTecnologia } },
      }),
    ).toBe(2);
  });

  it('rechaza con 400 campos inválidos, no declarados, fechas invertidas y media inexistente', async () => {
    const malos: Record<string, unknown>[] = [
      { modalidad: 'oficina' },
      { empresa: '' },
      { campo_inventado: 1 },
      { url_empresa: 'http://example.com' },
      { fecha_inicio: '2021-02-30' },
      { fecha_inicio: '2021-02-01', fecha_fin: '2020-01-01' },
      { tecnologias: Array.from({ length: 31 }, (_, i) => `t${i}`) },
      { logo_media_id: '5f0c1c0e-6a5a-4a43-9d8e-0d8f6a5b4c3d' },
    ];
    for (const extra of malos) {
      await agent
        .post('/admin/experiencias')
        .send({ ...base, ...extra })
        .expect(400);
    }

    const ok = await crear();
    await agent
      .patch(`/admin/experiencias/${ok.id}`)
      .send({ fecha_fin: '2000-01-01' })
      .expect(400);
  });

  it('PATCH reordenar cambia el orden del listado', async () => {
    const a = await crear({ cargo: 'Orden A' });
    const b = await crear({ cargo: 'Orden B' });
    await agent
      .patch('/admin/experiencias/reordenar')
      .send([
        { id: a.id, orden: 9001 },
        { id: b.id, orden: 9000 },
      ])
      .expect(200);
    const lista = await agent.get('/admin/experiencias').expect(200);
    const ids = lista.body.map((e: { id: string }) => e.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });

  it('el logo cuenta como uso de media (409 al borrarlo, aparece en usos) y viaja en el snapshot', async () => {
    const png = await sharp({
      create: { width: 700, height: 700, channels: 3, background: '#11aa66' },
    })
      .png()
      .toBuffer();
    const media = await agent
      .post('/admin/media')
      .attach('file', png, 'logo-experiencia.png')
      .expect(201);
    idsMedia.push(media.body.id);
    keysMedia.push(media.body.s3_key);
    const variantes = await prisma.mediaVariante.findMany({
      where: { media_id: media.body.id },
    });
    keysMedia.push(...variantes.map((v) => v.s3_key));

    const exp = await crear({
      cargo: 'Con logo',
      empresa: `Logo SA ${sufijo}`,
      logo_media_id: media.body.id,
    });
    expect(exp.logo).toMatchObject({ id: media.body.id });
    expect(exp.logo.variantes.length).toBeGreaterThan(0);

    const usos = await agent.get('/admin/media/usos').expect(200);
    expect(usos.body[media.body.id]).toEqual([
      {
        tipo: 'experiencia',
        id: exp.id,
        nombre: `Con logo · Logo SA ${sufijo}`,
      },
    ]);
    await agent.delete(`/admin/media/${media.body.id}`).expect(409);

    const version = await agent.post('/admin/versiones/publicar').expect(201);
    idsVersiones.push(version.body.id);
    const sitio = await request(app.getHttpServer()).get('/sitio').expect(200);
    const enSnapshot = sitio.body.experiencias.find(
      (e: { id: string }) => e.id === exp.id,
    );
    expect(enSnapshot.logo).toMatchObject({
      id: media.body.id,
      url: media.body.url,
    });
    expect(enSnapshot.logo.variantes.length).toBeGreaterThan(0);
  });

  it('el snapshot publicado omite las ocultas, pone los puestos actuales primero y luego por fecha_inicio desc', async () => {
    const vieja = await crear({
      cargo: 'Snap vieja',
      fecha_inicio: '2010-01-01',
      fecha_fin: '2011-01-01',
    });
    const reciente = await crear({
      cargo: 'Snap reciente',
      fecha_inicio: '2019-01-01',
      fecha_fin: '2020-01-01',
    });
    const actual = await crear({
      cargo: 'Snap actual',
      fecha_inicio: '2015-01-01',
    });
    const oculta = await crear({ cargo: 'Snap oculta', visible: false });

    const version = await agent.post('/admin/versiones/publicar').expect(201);
    idsVersiones.push(version.body.id);

    const sitio = await request(app.getHttpServer()).get('/sitio').expect(200);
    const lista: { id: string; fecha_fin: string | null }[] =
      sitio.body.experiencias;
    const ids = lista.map((e) => e.id);

    expect(ids).not.toContain(oculta.id);
    expect(ids.indexOf(actual.id)).toBeLessThan(ids.indexOf(reciente.id));
    expect(ids.indexOf(reciente.id)).toBeLessThan(ids.indexOf(vieja.id));
    // Todos los puestos actuales preceden a cualquier puesto terminado.
    const primerTerminado = lista.findIndex((e) => e.fecha_fin !== null);
    expect(
      lista.slice(primerTerminado).every((e) => e.fecha_fin !== null),
    ).toBe(true);

    const e = lista.find((x) => x.id === actual.id)!;
    for (const campo of [
      'usuario_admin_id',
      'logo_media_id',
      'visible',
      'created_at',
      'updated_at',
    ]) {
      expect(e).not.toHaveProperty(campo);
    }
    expect(e).toMatchObject({ logo: null, tecnologias: [], fecha_fin: null });
  });
});
