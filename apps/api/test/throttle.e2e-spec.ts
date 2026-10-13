import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { crearAppDePrueba } from './utils/test-app';

/**
 * Fase 6 (UC-01): con el throttler activo, `POST /auth/login` responde 429
 * al superar su límite. Se fija un límite de 2 antes de crear la app.
 */
describe('Rate limiting de /auth/login (e2e, Fase 6)', () => {
  let app: INestApplication;
  const envOriginal = process.env.THROTTLE_LOGIN_LIMIT;

  beforeAll(async () => {
    process.env.THROTTLE_LOGIN_LIMIT = '2';
    app = await crearAppDePrueba();
  });

  afterAll(async () => {
    if (envOriginal === undefined) delete process.env.THROTTLE_LOGIN_LIMIT;
    else process.env.THROTTLE_LOGIN_LIMIT = envOriginal;
    await app.close();
  });

  it('responde 429 al tercer intento de login dentro de la ventana', async () => {
    const intento = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nadie@example.com', password: 'incorrecta-123' });

    expect((await intento()).status).toBe(401);
    expect((await intento()).status).toBe(401);
    expect((await intento()).status).toBe(429);
  });
});
