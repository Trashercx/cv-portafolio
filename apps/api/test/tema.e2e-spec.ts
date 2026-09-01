import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-08 (Personalizar tema visual).
 *
 * Criterio de aceptación (docs/plan-portafolio.md): "Un tema guardado y
 * marcado como activo se aplica de inmediato a la vista previa del sitio."
 * Regla de negocio (sección 4): solo un `Tema` por administrador puede
 * tener `activo = true` a la vez.
 */
describe('Tema (e2e, UC-08)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;

  const idsCreados: string[] = [];

  const dtoBase = {
    color_primario: '#111111',
    color_secundario: '#222222',
    color_fondo: '#ffffff',
    color_texto: '#000000',
    fuente_principal: 'Inter',
    modo: 'claro',
  };

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    await prisma.tema.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  // -----------------------------------------------------------------------
  // 401
  // -----------------------------------------------------------------------

  it('GET /admin/temas sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/temas').expect(401);
  });

  it('POST /admin/temas sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/temas')
      .send({ ...dtoBase, nombre: 'X' })
      .expect(401);
  });

  it('PATCH /admin/temas/:id/activar sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/temas/${randomUUID()}/activar`)
      .expect(401);
  });

  // -----------------------------------------------------------------------
  // 400
  // -----------------------------------------------------------------------

  it('POST /admin/temas rechaza campos fuera del DTO', async () => {
    await agent
      .post('/admin/temas')
      .send({ ...dtoBase, nombre: 'X', activo: true })
      .expect(400);
  });

  it('POST /admin/temas rechaza un modo fuera de claro|oscuro', async () => {
    await agent
      .post('/admin/temas')
      .send({ ...dtoBase, nombre: 'X', modo: 'sepia' })
      .expect(400);
  });

  // -----------------------------------------------------------------------
  // Caso feliz + criterio de aceptación de UC-08
  // -----------------------------------------------------------------------

  it('crea temas inactivos por default y activar desactiva cualquier otro tema activo del mismo admin', async () => {
    const sufijo = Date.now();

    const temaA = await agent
      .post('/admin/temas')
      .send({ ...dtoBase, nombre: `Tema A e2e ${sufijo}` })
      .expect(201);
    idsCreados.push(temaA.body.id);
    expect(temaA.body.activo).toBe(false);

    const temaB = await agent
      .post('/admin/temas')
      .send({ ...dtoBase, nombre: `Tema B e2e ${sufijo}`, modo: 'oscuro' })
      .expect(201);
    idsCreados.push(temaB.body.id);
    expect(temaB.body.activo).toBe(false);

    // Activar A.
    const activadoA = await agent
      .patch(`/admin/temas/${temaA.body.id}/activar`)
      .expect(200);
    expect(activadoA.body.activo).toBe(true);

    let enBaseDeDatosA = await prisma.tema.findUnique({
      where: { id: temaA.body.id },
    });
    expect(enBaseDeDatosA?.activo).toBe(true);

    // Activar B debe desactivar A (exclusividad: solo un activo por admin).
    const activadoB = await agent
      .patch(`/admin/temas/${temaB.body.id}/activar`)
      .expect(200);
    expect(activadoB.body.activo).toBe(true);

    enBaseDeDatosA = await prisma.tema.findUnique({
      where: { id: temaA.body.id },
    });
    const enBaseDeDatosB = await prisma.tema.findUnique({
      where: { id: temaB.body.id },
    });
    expect(enBaseDeDatosA?.activo).toBe(false);
    expect(enBaseDeDatosB?.activo).toBe(true);

    // Nunca queda más de un tema activo para este admin.
    const activos = await prisma.tema.count({
      where: { id: { in: idsCreados }, activo: true },
    });
    expect(activos).toBe(1);
  });

  it('CRUD general: listar, obtener, actualizar y eliminar', async () => {
    const sufijo = Date.now();

    const creado = await agent
      .post('/admin/temas')
      .send({ ...dtoBase, nombre: `Tema CRUD e2e ${sufijo}` })
      .expect(201);
    idsCreados.push(creado.body.id);

    await agent.get('/admin/temas').expect(200);
    await agent.get(`/admin/temas/${creado.body.id}`).expect(200);

    const editado = await agent
      .patch(`/admin/temas/${creado.body.id}`)
      .send({ color_primario: '#abcdef' })
      .expect(200);
    expect(editado.body.color_primario).toBe('#abcdef');

    await agent.delete(`/admin/temas/${creado.body.id}`).expect(200);
    await agent.get(`/admin/temas/${creado.body.id}`).expect(404);
  });
});
