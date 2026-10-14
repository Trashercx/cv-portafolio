import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/** Fase 8, UC-27: `GET /admin/metricas` (proxy tolerante a fallos de Umami). */
describe('Métricas (e2e, Fase 8, UC-27)', () => {
  let app: INestApplication;
  let agent: Awaited<ReturnType<typeof agenteAutenticado>>;
  const variables = [
    'UMAMI_API_URL',
    'UMAMI_WEBSITE_ID',
    'UMAMI_API_TOKEN',
    'UMAMI_USUARIO',
    'UMAMI_CONTRASENA',
  ];
  const guardadas: Record<string, string | undefined> = {};

  beforeAll(async () => {
    // El e2e siempre corre sin Umami configurado, aunque .env lo tenga.
    for (const v of variables) {
      guardadas[v] = process.env[v];
      delete process.env[v];
    }
    app = await crearAppDePrueba();
    agent = await agenteAutenticado(app);
  });

  afterAll(async () => {
    for (const v of variables) {
      if (guardadas[v] === undefined) delete process.env[v];
      else process.env[v] = guardadas[v];
    }
    await app.close();
  });

  it('sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/admin/metricas').expect(401);
  });

  it('con sesión y sin variables de Umami: 200 no_configurado', async () => {
    const res = await agent.get('/admin/metricas').expect(200);
    expect(res.body).toEqual({ disponible: false, motivo: 'no_configurado' });
  });

  it('acepta periodo 7, 30 y 90', async () => {
    for (const periodo of [7, 30, 90]) {
      await agent.get(`/admin/metricas?periodo=${periodo}`).expect(200);
    }
  });

  it('periodo fuera de 7|30|90 responde 400', async () => {
    await agent.get('/admin/metricas?periodo=15').expect(400);
    await agent.get('/admin/metricas?periodo=abc').expect(400);
  });
});
