import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-05 (Gestionar logros y reconocimientos), e2e contra la base de datos real.
 *
 * Criterio de aceptación (docs/plan-portafolio.md): "Un logro nuevo aparece
 * en la sección correspondiente sin necesidad de despliegue de código." Se
 * verifica creando un logro vía la API de administración y comprobando que
 * aparece de inmediato en `GET /logros` (público), sin ningún paso extra.
 */
describe('Logros (e2e, UC-05)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsCreados: string[] = [];

  const dtoBase = {
    descripcion: 'Descripción de prueba generada por el e2e de UC-05.',
    fecha: '2024-03-10',
    categoria: 'reconocimiento',
  };

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    await prisma.logro.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401
  // -----------------------------------------------------------------------

  it('GET /admin/logros sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/logros').expect(401);
  });

  it('POST /admin/logros sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/logros')
      .send({ ...dtoBase, titulo: 'X', orden: 1 })
      .expect(401);
  });

  it('PATCH /admin/logros/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/logros/${randomUUID()}`)
      .send({ titulo: 'X' })
      .expect(401);
  });

  it('DELETE /admin/logros/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/logros/${randomUUID()}`)
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 400
  // -----------------------------------------------------------------------

  it('POST /admin/logros rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/logros')
      .send({ ...dtoBase, titulo: 'X', orden: 1, destacado: true })
      .expect(400);
  });

  // -----------------------------------------------------------------------
  // Caso feliz + criterio de aceptación de UC-05
  // -----------------------------------------------------------------------

  it('un logro creado por el admin aparece de inmediato en la lista pública', async () => {
    const sufijo = Date.now();
    const titulo = `Logro e2e ${sufijo}`;

    const listaAntes = await request(app.getHttpServer())
      .get('/logros')
      .expect(200);
    expect(
      listaAntes.body.some((l: { titulo: string }) => l.titulo === titulo),
    ).toBe(false);

    const creado = await agent
      .post('/admin/logros')
      .send({ ...dtoBase, titulo, orden: 9001 })
      .expect(201);
    idsCreados.push(creado.body.id);

    const listaDespues = await request(app.getHttpServer())
      .get('/logros')
      .expect(200);
    const logroEnLista = listaDespues.body.find(
      (l: { id: string }) => l.id === creado.body.id,
    );
    expect(logroEnLista).toMatchObject({
      titulo,
      categoria: dtoBase.categoria,
    });

    // Editar se refleja también sin despliegue.
    await agent
      .patch(`/admin/logros/${creado.body.id}`)
      .send({ titulo: `${titulo} editado` })
      .expect(200);

    const listaTrasEditar = await request(app.getHttpServer())
      .get('/logros')
      .expect(200);
    expect(
      listaTrasEditar.body.find((l: { id: string }) => l.id === creado.body.id)
        .titulo,
    ).toBe(`${titulo} editado`);

    // Eliminar lo saca de la lista pública.
    await agent.delete(`/admin/logros/${creado.body.id}`).expect(200);

    const listaTrasEliminar = await request(app.getHttpServer())
      .get('/logros')
      .expect(200);
    expect(
      listaTrasEliminar.body.some(
        (l: { id: string }) => l.id === creado.body.id,
      ),
    ).toBe(false);
  });
});
