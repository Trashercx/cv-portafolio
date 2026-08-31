import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);
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
    });
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
