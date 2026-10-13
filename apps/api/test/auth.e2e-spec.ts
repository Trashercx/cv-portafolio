import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { agenteAutenticado, crearAppDePrueba } from './utils/test-app';

/**
 * UC-01 (Iniciar sesión) end-to-end, contra la base de datos real ya sembrada
 * (ver apps/api/.env: ADMIN_EMAIL / ADMIN_PASSWORD_SEED). Requiere que Postgres
 * esté disponible (docker-compose) y el admin ya sembrado (prisma/seed.ts).
 */
describe('POST /auth/login (e2e, UC-01)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = process.env.ADMIN_EMAIL as string;
  const adminPassword = process.env.ADMIN_PASSWORD_SEED as string;

  beforeAll(async () => {
    // Fase 6: crearAppDePrueba desactiva el rate limiting.
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Deja la cuenta en un estado limpio para no afectar otras corridas de pruebas.
    await prisma.usuarioAdmin.updateMany({
      where: { email: adminEmail },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });
    await app.close();
  });

  beforeEach(async () => {
    await prisma.usuarioAdmin.updateMany({
      where: { email: adminEmail },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });
  });

  it('con credenciales válidas responde 200, setea la cookie access_token y no expone el hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    expect(response.body).toEqual({
      email: adminEmail,
      nombre: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
    expect(response.body.password_hash).toBeUndefined();

    const setCookieHeader = response.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    const accessTokenCookie = cookies.find((c: string) =>
      c.startsWith('access_token='),
    );
    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie).toMatch(/HttpOnly/i);
  });

  it('con contraseña incorrecta responde 401 y no filtra el token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'contraseña-incorrecta-de-prueba' })
      .expect(401);

    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('con email inexistente responde 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-existe@example.com', password: 'cualquier-cosa-123' })
      .expect(401);
  });

  it('rechaza campos fuera del DTO (whitelist/forbidNonWhitelisted)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword, rol: 'admin' })
      .expect(400);
  });

  it('bloquea la cuenta tras 3 intentos fallidos consecutivos', async () => {
    for (let i = 0; i < 2; i += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: 'incorrecta' })
        .expect(401);
    }

    // Tercer intento fallido: se bloquea.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'incorrecta' })
      .expect(401);

    // Cuarto intento, incluso con la contraseña correcta: sigue bloqueado.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(401);
  });
});

describe('POST /auth/refresh (e2e, UC-01 extensión de sesión)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = process.env.ADMIN_EMAIL as string;
  const adminPassword = process.env.ADMIN_PASSWORD_SEED as string;

  beforeAll(async () => {
    app = await crearAppDePrueba();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.usuarioAdmin.updateMany({
      where: { email: adminEmail },
      data: { intentos_fallidos: 0, bloqueado_hasta: null },
    });
    await app.close();
  });

  it('sin cookie responde 401', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('con una sesión vigente responde 200, renueva la cookie y devuelve el mismo shape que login', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const response = await agent.post('/auth/refresh').expect(200);

    expect(response.body).toEqual({
      email: adminEmail,
      nombre: expect.any(String),
      expiresAt: expect.any(String),
    });

    const setCookieHeader = response.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    const accessTokenCookie = cookies.find((c: string) =>
      c.startsWith('access_token='),
    );
    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie).toMatch(/HttpOnly/i);
  });
});

describe('POST /auth/logout (e2e, UC-01, Fase 6)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 204, borra la cookie y la sesión deja de valer en rutas admin', async () => {
    const agent = await agenteAutenticado(app);
    await agent.get('/admin/perfil').expect(200);

    const res = await agent.post('/auth/logout').expect(204);
    const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const borrada = setCookie.find((c) => c.startsWith('access_token=;'));
    expect(borrada).toBeDefined();
    expect(borrada).toMatch(/HttpOnly/i);
    expect(borrada).toMatch(/Path=\//);

    await agent.get('/admin/perfil').expect(401);
  });

  it('funciona sin sesión (sin guard)', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(204);
  });
});

describe('GET /auth/sesion (e2e, octava ronda, UC-01)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sin cookie responde 401', async () => {
    await request(app.getHttpServer()).get('/auth/sesion').expect(401);
  });

  it('con sesion vigente responde 200 con admin.email y expiracion futura, sin cookie nueva', async () => {
    const agent = await agenteAutenticado(app);
    const res = await agent.get('/auth/sesion').expect(200);

    expect(res.body).toEqual({
      email: process.env.ADMIN_EMAIL,
      nombre: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.body.password_hash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('tras logout responde 401', async () => {
    const agent = await agenteAutenticado(app);
    await agent.get('/auth/sesion').expect(200);
    await agent.post('/auth/logout').expect(204);
    await agent.get('/auth/sesion').expect(401);
  });
});
