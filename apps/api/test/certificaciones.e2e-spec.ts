import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-04 (Gestionar certificaciones), e2e contra la base de datos real.
 *
 * Criterio de aceptación (docs/plan-portafolio.md): "Las certificaciones se
 * listan ordenadas por fecha u orden manual, con enlace de verificación
 * funcional."
 */
describe('Certificaciones (e2e, UC-04)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsCreados: string[] = [];

  const dtoBase = {
    institucion: 'Institución e2e',
    fecha_emision: '2023-05-01',
    url_verificacion: 'https://verificacion.example.com/cert',
  };

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    await prisma.certificacion.deleteMany({
      where: { id: { in: idsCreados } },
    });
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401
  // -----------------------------------------------------------------------

  it('GET /admin/certificaciones sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .get('/admin/certificaciones')
      .expect(401);
  });

  it('POST /admin/certificaciones sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/certificaciones')
      .send({ ...dtoBase, nombre: 'X', orden: 1 })
      .expect(401);
  });

  it('PATCH /admin/certificaciones/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/certificaciones/${randomUUID()}`)
      .send({ nombre: 'X' })
      .expect(401);
  });

  it('DELETE /admin/certificaciones/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/certificaciones/${randomUUID()}`)
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 400
  // -----------------------------------------------------------------------

  it('POST /admin/certificaciones rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/certificaciones')
      .send({ ...dtoBase, nombre: 'X', orden: 1, emisor_verificado: true })
      .expect(400);
  });

  // -----------------------------------------------------------------------
  // Caso feliz + criterio de aceptación de UC-04
  // -----------------------------------------------------------------------

  it('crea certificaciones, las lista ordenadas y expone el enlace de verificación', async () => {
    const sufijo = Date.now();

    const certA = await agent
      .post('/admin/certificaciones')
      .send({
        ...dtoBase,
        nombre: `Certificación A e2e ${sufijo}`,
        url_verificacion: 'https://verificacion.example.com/cert-a',
        orden: 9001,
      })
      .expect(201);
    idsCreados.push(certA.body.id);

    const certB = await agent
      .post('/admin/certificaciones')
      .send({
        ...dtoBase,
        nombre: `Certificación B e2e ${sufijo}`,
        url_verificacion: 'https://verificacion.example.com/cert-b',
        orden: 9002,
      })
      .expect(201);
    idsCreados.push(certB.body.id);

    // Listado público, ordenado por `orden` ascendente.
    const listaPublica = await request(app.getHttpServer())
      .get('/certificaciones')
      .expect(200);
    const idsDePrueba = new Set(idsCreados);
    const ordenObservado = listaPublica.body
      .filter((c: { id: string }) => idsDePrueba.has(c.id))
      .map((c: { id: string }) => c.id);
    expect(ordenObservado).toEqual([certA.body.id, certB.body.id]);

    // Detalle público con enlace de verificación funcional (URL persistida tal cual).
    const detallePublico = await request(app.getHttpServer())
      .get(`/certificaciones/${certA.body.id}`)
      .expect(200);
    expect(detallePublico.body.url_verificacion).toBe(
      'https://verificacion.example.com/cert-a',
    );

    // Editar se refleja en el detalle público.
    await agent
      .patch(`/admin/certificaciones/${certA.body.id}`)
      .send({ nombre: `Certificación A editada ${sufijo}` })
      .expect(200);

    const detalleTrasEditar = await request(app.getHttpServer())
      .get(`/certificaciones/${certA.body.id}`)
      .expect(200);
    expect(detalleTrasEditar.body.nombre).toBe(
      `Certificación A editada ${sufijo}`,
    );

    // Reordenar invierte el orden observado en la lista pública.
    await agent
      .patch(`/admin/certificaciones/${certA.body.id}`)
      .send({ orden: 9003 })
      .expect(200);
    await agent
      .patch(`/admin/certificaciones/${certB.body.id}`)
      .send({ orden: 9000 })
      .expect(200);

    const listaPublica2 = await request(app.getHttpServer())
      .get('/certificaciones')
      .expect(200);
    const ordenObservado2 = listaPublica2.body
      .filter((c: { id: string }) => idsDePrueba.has(c.id))
      .map((c: { id: string }) => c.id);
    expect(ordenObservado2).toEqual([certB.body.id, certA.body.id]);

    // Eliminar la saca de la lista pública.
    await agent.delete(`/admin/certificaciones/${certB.body.id}`).expect(200);

    const listaPublica3 = await request(app.getHttpServer())
      .get('/certificaciones')
      .expect(200);
    const idsRestantes = listaPublica3.body.map((c: { id: string }) => c.id);
    expect(idsRestantes).not.toContain(certB.body.id);
    expect(idsRestantes).toContain(certA.body.id);
  });
});
