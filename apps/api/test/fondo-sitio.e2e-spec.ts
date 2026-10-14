import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-15 ext. (Fase 7b): fondos con el catálogo nuevo, `intensidad` e
 * `interactivo` persistidos tal cual en `configuracion`. Al terminar se
 * restaura el fondo que estuviera activo antes de la prueba.
 */
describe('FondoSitio (e2e, UC-15 Fase 7b)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  const idsCreados: string[] = [];
  let activosPrevios: string[] = [];

  const configuracionBase = { velocidad: 'media', opacidad: 0.5 };

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
    agent = await agenteAutenticado(app);
    const activos = await prisma.fondoSitio.findMany({
      where: { activo: true },
      select: { id: true },
    });
    activosPrevios = activos.map((f) => f.id);
  });

  afterAll(async () => {
    await prisma.fondoSitio.deleteMany({ where: { id: { in: idsCreados } } });
    if (activosPrevios.length > 0) {
      await prisma.fondoSitio.updateMany({
        where: { id: { in: activosPrevios } },
        data: { activo: true },
      });
    }
    await app.close();
  });

  it('POST /admin/fondos sin cookie responde 401', async () => {
    await request(app.getHttpServer())
      .post('/admin/fondos')
      .send({ tipo: 'aurora_mesh', configuracion: configuracionBase })
      .expect(401);
  });

  it('rechaza un tipo antiguo con 400', async () => {
    await agent
      .post('/admin/fondos')
      .send({ tipo: 'aurora_animada', configuracion: configuracionBase })
      .expect(400);
  });

  it('rechaza intensidad inválida con 400', async () => {
    await agent
      .post('/admin/fondos')
      .send({
        tipo: 'aurora_mesh',
        configuracion: { ...configuracionBase, intensidad: 'x' },
      })
      .expect(400);
  });

  it('crea y activa un fondo aurora_mesh con intensidad e interactivo', async () => {
    const configuracion = {
      velocidad: 'lenta',
      opacidad: 0.6,
      intensidad: 'alta',
      interactivo: false,
    };
    const creado = await agent
      .post('/admin/fondos')
      .send({ tipo: 'aurora_mesh', configuracion })
      .expect(201);
    idsCreados.push(creado.body.id);
    expect(creado.body.tipo).toBe('aurora_mesh');
    expect(creado.body.activo).toBe(false);
    expect(creado.body.configuracion).toEqual(configuracion);

    const activado = await agent
      .patch(`/admin/fondos/${creado.body.id}/activar`)
      .expect(200);
    expect(activado.body.activo).toBe(true);
    expect(activado.body.configuracion).toEqual(configuracion);

    const lista = await agent.get('/admin/fondos').expect(200);
    const activos = (lista.body as { activo: boolean }[]).filter(
      (f) => f.activo,
    );
    expect(activos).toHaveLength(1);
  });
});
