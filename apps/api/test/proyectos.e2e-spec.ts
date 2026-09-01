import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-03 (Gestionar proyectos), e2e contra la base de datos real. Se agrupa
 * con el catálogo de tecnologías (soporte de UC-03) porque un proyecto se
 * asocia a tecnologías existentes en ese catálogo.
 *
 * Criterio de aceptación (docs/plan-portafolio.md): "Un proyecto creado,
 * editado o eliminado se refleja en la lista de proyectos respetando el
 * orden definido."
 *
 * Desde Sprint 4 (UC-12/UC-13, ver docs/plan-tecnico.md) esta verificación
 * se hace contra `/admin/proyectos` (panel), no contra un endpoint público:
 * el visitante deja de leer esta tabla en vivo y pasa a leer siempre el
 * snapshot publicado — ver `test/publico.e2e-spec.ts` para esa parte del
 * criterio.
 */
describe('Proyectos y tecnologías (e2e, UC-03)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsProyectosCreados: string[] = [];
  const idsTecnologiasCreadas: string[] = [];

  const dtoProyectoBase = {
    descripcion: 'Proyecto de prueba generado por el e2e de UC-03.',
    fecha_inicio: '2024-01-01',
    estado: 'en_progreso',
    destacado: false,
  };

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    await prisma.proyectoTecnologia.deleteMany({
      where: { proyecto_id: { in: idsProyectosCreados } },
    });
    await prisma.proyectoImagen.deleteMany({
      where: { proyecto_id: { in: idsProyectosCreados } },
    });
    await prisma.proyecto.deleteMany({
      where: { id: { in: idsProyectosCreados } },
    });
    await prisma.tecnologia.deleteMany({
      where: { id: { in: idsTecnologiasCreadas } },
    });

    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401: rutas de administración sin cookie
  // -----------------------------------------------------------------------

  it('GET /admin/proyectos sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/proyectos').expect(401);
  });

  it('POST /admin/proyectos sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/proyectos')
      .send({ ...dtoProyectoBase, titulo: 'X', orden: 1 })
      .expect(401);
  });

  it('PATCH /admin/proyectos/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/proyectos/${randomUUID()}`)
      .send({ titulo: 'X' })
      .expect(401);
  });

  it('DELETE /admin/proyectos/:id sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/proyectos/${randomUUID()}`)
      .expect(401);
  });

  it('GET /admin/tecnologias sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/tecnologias').expect(401);
  });

  it('POST /admin/tecnologias sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/tecnologias')
      .send({ nombre: 'X' })
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 400: campos fuera del DTO
  // -----------------------------------------------------------------------

  it('POST /admin/proyectos rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/proyectos')
      .send({ ...dtoProyectoBase, titulo: 'X', orden: 1, favorito: true })
      .expect(400);
  });

  it('POST /admin/tecnologias rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/tecnologias')
      .send({ nombre: 'React Native', descripcion: 'no declarado' })
      .expect(400);
  });

  // -----------------------------------------------------------------------
  // Caso feliz + criterio de aceptación de UC-03
  // -----------------------------------------------------------------------

  it('crea (o reutiliza) una tecnología del catálogo', async () => {
    const nombre = `Tecnología e2e ${Date.now()}`;

    const respuesta = await agent
      .post('/admin/tecnologias')
      .send({ nombre })
      .expect(201);

    expect(respuesta.body).toMatchObject({ nombre });
    idsTecnologiasCreadas.push(respuesta.body.id);

    // Reutiliza sin duplicar (misma id la segunda vez).
    const segundaRespuesta = await agent
      .post('/admin/tecnologias')
      .send({ nombre })
      .expect(201);
    expect(segundaRespuesta.body.id).toBe(respuesta.body.id);
  });

  it('crea proyectos, los lista en /admin/proyectos respetando el orden, los edita y elimina reflejando el cambio', async () => {
    const sufijo = Date.now();

    // 1) Crear dos proyectos con orden A > B, para verificar el orden en el listado.
    const proyectoA = await agent
      .post('/admin/proyectos')
      .send({
        ...dtoProyectoBase,
        titulo: `Proyecto A e2e ${sufijo}`,
        orden: 9001,
      })
      .expect(201);
    idsProyectosCreados.push(proyectoA.body.id);

    const proyectoB = await agent
      .post('/admin/proyectos')
      .send({
        ...dtoProyectoBase,
        titulo: `Proyecto B e2e ${sufijo}`,
        orden: 9002,
      })
      .expect(201);
    idsProyectosCreados.push(proyectoB.body.id);

    // 2) El listado de administración respeta el orden (A antes que B).
    const lista1 = await agent.get('/admin/proyectos').expect(200);
    const idsDePrueba = new Set(idsProyectosCreados);
    const ordenObservado1 = lista1.body
      .filter((p: { id: string }) => idsDePrueba.has(p.id))
      .map((p: { id: string }) => p.id);
    expect(ordenObservado1).toEqual([proyectoA.body.id, proyectoB.body.id]);

    // 3) El detalle es accesible individualmente (UC-13 se verifica contra el
    // snapshot publicado en test/publico.e2e-spec.ts, no aquí).
    const detalle = await agent
      .get(`/admin/proyectos/${proyectoA.body.id}`)
      .expect(200);
    expect(detalle.body.titulo).toBe(`Proyecto A e2e ${sufijo}`);

    // 4) Editar un proyecto se refleja al leerlo de nuevo.
    await agent
      .patch(`/admin/proyectos/${proyectoA.body.id}`)
      .send({ titulo: `Proyecto A editado ${sufijo}` })
      .expect(200);

    const detalleTrasEditar = await agent
      .get(`/admin/proyectos/${proyectoA.body.id}`)
      .expect(200);
    expect(detalleTrasEditar.body.titulo).toBe(`Proyecto A editado ${sufijo}`);

    // 5) Reordenar invierte el orden observado en el listado.
    await agent
      .patch('/admin/proyectos/reordenar')
      .send([
        { id: proyectoA.body.id, orden: 9003 },
        { id: proyectoB.body.id, orden: 9000 },
      ])
      .expect(200);

    const lista2 = await agent.get('/admin/proyectos').expect(200);
    const ordenObservado2 = lista2.body
      .filter((p: { id: string }) => idsDePrueba.has(p.id))
      .map((p: { id: string }) => p.id);
    expect(ordenObservado2).toEqual([proyectoB.body.id, proyectoA.body.id]);

    // 6) Asociar/quitar una tecnología (relación N:M de soporte de UC-03).
    if (idsTecnologiasCreadas.length > 0) {
      const tecnologiaId = idsTecnologiasCreadas[0];
      await agent
        .post(
          `/admin/proyectos/${proyectoA.body.id}/tecnologias/${tecnologiaId}`,
        )
        .expect(201);

      const detalleConTecnologia = await agent
        .get(`/admin/proyectos/${proyectoA.body.id}`)
        .expect(200);
      expect(
        detalleConTecnologia.body.tecnologias.some(
          (t: { tecnologia_id: string }) => t.tecnologia_id === tecnologiaId,
        ),
      ).toBe(true);

      await agent
        .delete(
          `/admin/proyectos/${proyectoA.body.id}/tecnologias/${tecnologiaId}`,
        )
        .expect(200);
    }

    // 7) Eliminar un proyecto lo saca del listado.
    await agent.delete(`/admin/proyectos/${proyectoB.body.id}`).expect(200);

    const lista3 = await agent.get('/admin/proyectos').expect(200);
    const idsRestantes = lista3.body.map((p: { id: string }) => p.id);
    expect(idsRestantes).not.toContain(proyectoB.body.id);
    expect(idsRestantes).toContain(proyectoA.body.id);

    // El proyecto B ya fue borrado por el propio test; que el afterAll no falle
    // por intentar borrarlo de nuevo (deleteMany es seguro con ids inexistentes).
  });
});
