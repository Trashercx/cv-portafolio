import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './utils/test-app';

/** Fase 6: health checks públicos (liveness y readiness). */
describe('Health checks (e2e, Fase 6)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde { status: "ok" } sin autenticación', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready verifica la base de datos', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
  });
});
