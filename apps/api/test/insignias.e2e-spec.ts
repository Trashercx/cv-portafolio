import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { sharp } from '../src/modules/media/sharp';
import { LocalMediaStorageService } from '../src/modules/media/storage/local-media-storage.service';
import { MEDIA_STORAGE_SERVICE } from '../src/modules/media/storage/media-storage.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

// Resolución DNS controlada: ningún test depende de la red real.
jest.mock('dns/promises', () => ({
  ...jest.requireActual('dns/promises'),
  lookup: jest
    .fn()
    .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]),
}));

/**
 * UC-35 (Insignias importables, Fase 7d), e2e contra la base real. La
 * publicación y `GET /sitio` con insignias se verifican en
 * `sitio-publico.e2e-spec.ts` (único archivo que publica versiones).
 * supertest habla por `http`, así que interceptar `globalThis.fetch` solo
 * afecta a las descargas salientes del servidor.
 */
describe('Insignias (e2e, UC-35)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  const fetchOriginal = globalThis.fetch;

  const idsInsignias: string[] = [];
  const idsMedia: string[] = [];
  const keysMedia: string[] = [];

  const ID_CREDLY = '0bd5c2c1-1f0c-4b8c-9d7a-3e2a4a1b9c11';
  let png: Buffer;

  /** `fetch` falso por URL exacta; lo demás es 404. */
  function interceptarFetch(
    rutas: Record<string, { cuerpo: string | Buffer; tipo: string }>,
  ) {
    const mock = jest.fn(async (url: string) => {
      const ruta = rutas[url];
      if (!ruta) return new Response('no', { status: 404 });
      return new Response(ruta.cuerpo as BodyInit, {
        headers: { 'content-type': ruta.tipo },
      });
    });
    globalThis.fetch = mock as unknown as typeof fetch;
    return mock;
  }

  async function subirMedia(nombre: string) {
    const r = await agent
      .post('/admin/media')
      .attach('file', png, nombre)
      .expect(201);
    idsMedia.push(r.body.id);
    keysMedia.push(r.body.s3_key);
    return r.body as { id: string; url: string; s3_key: string };
  }

  beforeAll(async () => {
    app = await crearAppDePrueba((builder) =>
      builder
        .overrideProvider(MEDIA_STORAGE_SERVICE)
        .useClass(LocalMediaStorageService),
    );
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
    png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#2255aa' },
    })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    globalThis.fetch = fetchOriginal;
    // Las insignias referencian Media con onDelete Restrict: van antes.
    await prisma.insignia.deleteMany({ where: { id: { in: idsInsignias } } });
    await prisma.media.deleteMany({ where: { id: { in: idsMedia } } });
    await Promise.all(
      keysMedia.map((key) =>
        fs.unlink(join(process.cwd(), 'uploads', key)).catch(() => undefined),
      ),
    );
    await app.close();
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  // -----------------------------------------------------------------------
  // 401
  // -----------------------------------------------------------------------

  it.each([
    ['get', '/admin/insignias'],
    ['post', '/admin/insignias'],
    ['patch', '/admin/insignias/reordenar'],
    ['post', '/admin/insignias/importar'],
    ['post', '/admin/insignias/importar-archivo'],
    ['get', `/admin/insignias/${randomUUID()}`],
    ['patch', `/admin/insignias/${randomUUID()}`],
    ['delete', `/admin/insignias/${randomUUID()}`],
  ] as const)('%s %s sin cookie responde 401', async (metodo, ruta) => {
    await request(app.getHttpServer())[metodo](ruta).expect(401);
  });

  // -----------------------------------------------------------------------
  // CRUD + reordenar
  // -----------------------------------------------------------------------

  describe('CRUD', () => {
    let media: { id: string; url: string };
    let a: { id: string };
    let b: { id: string };

    it('POST crea una insignia con imagen_media_id y responde la imagen resuelta con variantes', async () => {
      media = await subirMedia('insignia-crud.png');
      const res = await agent
        .post('/admin/insignias')
        .send({
          nombre: 'Insignia A',
          emisor: 'Emisor A',
          descripcion: 'Descripción A',
          proveedor: 'credly',
          id_externo: ID_CREDLY,
          url_verificacion: `https://www.credly.com/badges/${ID_CREDLY}`,
          imagen_media_id: media.id,
          fecha_emision: '2024-03-15',
          fecha_expiracion: '2027-03-15',
          habilidades: ['AWS', 'Cloud'],
        })
        .expect(201);
      idsInsignias.push(res.body.id);
      a = res.body;

      expect(res.body).toMatchObject({
        nombre: 'Insignia A',
        proveedor: 'credly',
        habilidades: ['AWS', 'Cloud'],
        visible: true,
        imagen: { id: media.id, url: media.url },
      });
      expect(res.body.imagen).toHaveProperty('variantes');
      expect(res.body.fecha_emision).toBe('2024-03-15T00:00:00.000Z');
    });

    it('POST rechaza: sin imagen, con ambas, campo no declarado, imagen_url_remota http y media inexistente', async () => {
      const base = { nombre: 'X', emisor: 'Y' };
      await agent.post('/admin/insignias').send(base).expect(400);
      await agent
        .post('/admin/insignias')
        .send({
          ...base,
          imagen_media_id: media.id,
          imagen_url_remota: 'https://a.test/i.png',
        })
        .expect(400);
      await agent
        .post('/admin/insignias')
        .send({ ...base, imagen_media_id: media.id, campo_raro: 1 })
        .expect(400);
      await agent
        .post('/admin/insignias')
        .send({ ...base, imagen_url_remota: 'http://a.test/i.png' })
        .expect(400);
      await agent
        .post('/admin/insignias')
        .send({ ...base, imagen_media_id: randomUUID() })
        .expect(400);
    });

    it('POST con imagen_url_remota descarga la imagen, la sube a la biblioteca y la usa', async () => {
      interceptarFetch({
        'https://images.credly.com/img/remota.png': {
          cuerpo: png,
          tipo: 'image/png',
        },
      });
      const res = await agent
        .post('/admin/insignias')
        .send({
          nombre: 'Insignia B',
          emisor: 'Emisor B',
          imagen_url_remota: 'https://images.credly.com/img/remota.png',
        })
        .expect(201);
      idsInsignias.push(res.body.id);
      b = res.body;
      idsMedia.push(res.body.imagen.id);
      keysMedia.push(res.body.imagen.s3_key);

      expect(res.body.imagen.id).not.toBe(media.id);
      expect(res.body.imagen.alt_text).toBe('Insignia B');
      expect(res.body.imagen.tipo).toBe('imagen');
    });

    it('POST con imagen_url_remota a una IP privada responde 400 y no crea nada', async () => {
      const antes = await prisma.insignia.count();
      await agent
        .post('/admin/insignias')
        .send({
          nombre: 'Insegura',
          emisor: 'X',
          imagen_url_remota: 'https://169.254.169.254/latest/meta-data',
        })
        .expect(400);
      expect(await prisma.insignia.count()).toBe(antes);
    });

    it('GET lista por orden y GET :id devuelve una; :id inexistente es 404', async () => {
      const lista = await agent.get('/admin/insignias').expect(200);
      const ids = lista.body.map((i: { id: string }) => i.id);
      expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id));
      expect(lista.body[0]).toHaveProperty('imagen');

      const una = await agent.get(`/admin/insignias/${a.id}`).expect(200);
      expect(una.body.nombre).toBe('Insignia A');
      await agent.get(`/admin/insignias/${randomUUID()}`).expect(404);
      await agent.get('/admin/insignias/no-uuid').expect(400);
    });

    it('PATCH :id edita campos, oculta y limpia fechas con null', async () => {
      const res = await agent
        .patch(`/admin/insignias/${a.id}`)
        .send({ nombre: 'Insignia A2', visible: false, fecha_expiracion: null })
        .expect(200);
      expect(res.body).toMatchObject({
        nombre: 'Insignia A2',
        visible: false,
        fecha_expiracion: null,
        emisor: 'Emisor A',
      });
      await agent
        .patch(`/admin/insignias/${a.id}`)
        .send({ campo_raro: true })
        .expect(400);
    });

    it('PATCH reordenar cambia el orden y GET lo refleja', async () => {
      await agent
        .patch('/admin/insignias/reordenar')
        .send({ ids: [b.id, a.id] })
        .expect(200, { actualizados: 2 });
      const lista = await agent.get('/admin/insignias').expect(200);
      const ids = lista.body.map((i: { id: string }) => i.id);
      expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));

      await agent
        .patch('/admin/insignias/reordenar')
        .send({ ids: [a.id, randomUUID()] })
        .expect(404);
      await agent
        .patch('/admin/insignias/reordenar')
        .send({ ids: [] })
        .expect(400);
    });

    it('la imagen en uso no se puede borrar (409), GET /admin/media/usos la lista y tras eliminar la insignia sí', async () => {
      const res = await agent.delete(`/admin/media/${media.id}`).expect(409);
      expect(res.body.message).toMatch(/insignia/);

      const usos = await agent.get('/admin/media/usos').expect(200);
      expect(usos.body[media.id]).toEqual([
        { tipo: 'insignia', id: a.id, nombre: 'Insignia A2' },
      ]);

      await agent
        .delete(`/admin/insignias/${a.id}`)
        .expect(200, { eliminado: true });
      await agent.get(`/admin/insignias/${a.id}`).expect(404);

      // DELETE de la insignia no borró la media.
      await agent.get(`/admin/media/${media.id}`).expect(200);
      await agent.delete(`/admin/media/${media.id}`).expect(200);
      await agent.delete(`/admin/insignias/${randomUUID()}`).expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // Importación
  // -----------------------------------------------------------------------

  describe('importar', () => {
    it('Credly ficticio: página + badges.json -> vista previa sin persistir', async () => {
      const antes = await prisma.insignia.count();
      interceptarFetch({
        [`https://www.credly.com/badges/${ID_CREDLY}`]: {
          cuerpo:
            '<a href="/users/sign_in">x</a><a href="/users/jane-doe">Jane</a>',
          tipo: 'text/html',
        },
        'https://www.credly.com/users/jane-doe/badges.json': {
          cuerpo: JSON.stringify({
            data: [
              {
                id: ID_CREDLY,
                issued_at_date: '2024-03-15',
                expires_at_date: null,
                image_url: 'https://images.credly.com/size/340x340/i/x.png',
                badge_template: {
                  name: 'Badge Ficticio',
                  description: 'Desc',
                  skills: [{ name: 'Testing' }],
                },
                issuer: {
                  entities: [
                    { primary: true, entity: { name: 'Org Ficticia' } },
                  ],
                },
              },
            ],
          }),
          tipo: 'application/json; charset=utf-8',
        },
      });

      const res = await agent
        .post('/admin/insignias/importar')
        .send({ entrada: `https://www.credly.com/badges/${ID_CREDLY}` })
        .expect(201);

      expect(res.body).toEqual({
        proveedor: 'credly',
        nombre: 'Badge Ficticio',
        emisor: 'Org Ficticia',
        descripcion: 'Desc',
        fecha_emision: '2024-03-15',
        fecha_expiracion: null,
        habilidades: ['Testing'],
        url_verificacion: `https://www.credly.com/badges/${ID_CREDLY}`,
        id_externo: ID_CREDLY,
        url_origen: `https://www.credly.com/badges/${ID_CREDLY}`,
        imagen: { url: 'https://images.credly.com/i/x.png' },
        avisos: [],
      });
      expect(await prisma.insignia.count()).toBe(antes);
    });

    it('código de embed de Credly también se reconoce', async () => {
      const mock = interceptarFetch({});
      const res = await agent
        .post('/admin/insignias/importar')
        .send({
          entrada: `<div data-share-badge-id="${ID_CREDLY}" data-share-badge-host="https://www.credly.com"></div>`,
        })
        .expect(201);
      expect(res.body.proveedor).toBe('credly');
      expect(res.body.id_externo).toBe(ID_CREDLY);
      expect(mock).toHaveBeenCalled();
      // Credly inalcanzable (404): campos vacíos y aviso, no 5xx.
      expect(res.body.nombre).toBe('');
      expect(res.body.avisos.length).toBeGreaterThan(0);
    });

    it('página genérica con og:*', async () => {
      interceptarFetch({
        'https://acreditaciones.ejemplo.test/b/7': {
          cuerpo:
            '<html><head><meta property="og:title" content="Insignia Genérica"><meta property="og:image" content="https://acreditaciones.ejemplo.test/i.png"></head></html>',
          tipo: 'text/html',
        },
      });
      const res = await agent
        .post('/admin/insignias/importar')
        .send({ entrada: 'https://acreditaciones.ejemplo.test/b/7' })
        .expect(201);
      expect(res.body).toMatchObject({
        proveedor: 'generico',
        nombre: 'Insignia Genérica',
        imagen: { url: 'https://acreditaciones.ejemplo.test/i.png' },
      });
      expect(res.body.avisos.length).toBeGreaterThan(0);
    });

    it('un destino privado no se contacta: 201 con aviso y sin llamar a fetch', async () => {
      const mock = interceptarFetch({});
      const res = await agent
        .post('/admin/insignias/importar')
        .send({ entrada: 'https://169.254.169.254/latest/meta-data' })
        .expect(201);
      expect(res.body.nombre).toBe('');
      expect(res.body.imagen).toBeNull();
      expect(res.body.avisos[0]).toMatch(/no está permitido/);
      expect(mock).not.toHaveBeenCalled();
    });

    it('entrada basura (sin URL, embed ni imagen) responde 400; entrada vacía o enorme también', async () => {
      await agent
        .post('/admin/insignias/importar')
        .send({ entrada: 'esto no es nada útil' })
        .expect(400);
      await agent
        .post('/admin/insignias/importar')
        .send({ entrada: '  ' })
        .expect(400);
      await agent
        .post('/admin/insignias/importar')
        .send({ entrada: 'a'.repeat(4001) })
        .expect(400);
      await agent
        .post('/admin/insignias/importar')
        .send({ entrada: 'https://a.test', otro: 1 })
        .expect(400);
    });
  });

  describe('importar-archivo', () => {
    it('PNG sin Open Badges: sube a la biblioteca y devuelve vista vacía con imagen_media_id', async () => {
      const res = await agent
        .post('/admin/insignias/importar-archivo')
        .attach('file', png, {
          filename: 'plano.png',
          contentType: 'image/png',
        })
        .expect(201);
      idsMedia.push(res.body.imagen_media_id);
      const media = await prisma.media.findUniqueOrThrow({
        where: { id: res.body.imagen_media_id },
      });
      keysMedia.push(media.s3_key);

      expect(res.body.nombre).toBe('');
      expect(res.body.imagen).toMatchObject({ url: media.url, formato: 'png' });
      expect(res.body.avisos.length).toBe(1);
    });

    it('SVG con Open Badges horneado completa la vista previa', async () => {
      const assertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        issuedOn: '2024-01-02T00:00:00Z',
        badge: {
          type: 'BadgeClass',
          name: 'Horneada e2e',
          description: 'D',
          image: 'https://a.test/b.png',
          issuer: { name: 'Quien Emite' },
        },
      };
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:openbadges="http://openbadges.org" width="4" height="4"><openbadges:assertion verify="https://a.test/v"><![CDATA[${JSON.stringify(assertion)}]]></openbadges:assertion></svg>`;
      const res = await agent
        .post('/admin/insignias/importar-archivo')
        .attach('file', Buffer.from(svg), {
          filename: 'horneada.svg',
          contentType: 'image/svg+xml',
        })
        .expect(201);
      idsMedia.push(res.body.imagen_media_id);
      const media = await prisma.media.findUniqueOrThrow({
        where: { id: res.body.imagen_media_id },
      });
      keysMedia.push(media.s3_key);

      expect(res.body).toMatchObject({
        proveedor: 'open_badges',
        nombre: 'Horneada e2e',
        emisor: 'Quien Emite',
        fecha_emision: '2024-01-02',
        imagen: { url: media.url, formato: 'svg' },
      });
    });

    it('rechaza tipos distintos de PNG/SVG y la ausencia de archivo (400)', async () => {
      await agent
        .post('/admin/insignias/importar-archivo')
        .attach('file', Buffer.from('hola'), {
          filename: 'a.txt',
          contentType: 'text/plain',
        })
        .expect(400);
      await agent.post('/admin/insignias/importar-archivo').expect(400);
    });
  });
});
