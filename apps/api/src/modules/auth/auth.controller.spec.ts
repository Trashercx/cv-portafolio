import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * Pruebas unitarias de AuthController con AuthService mockeado, pero con
 * JwtStrategy/JwtAuthGuard reales (sin Postgres: JwtStrategy no depende de
 * Prisma) para verificar el comportamiento real del guard en `POST /auth/refresh`
 * (UC-01, extensión de sesión). No requiere base de datos.
 */
describe('AuthController (UC-01: POST /auth/login y POST /auth/refresh)', () => {
  let app: INestApplication;
  let authService: { login: jest.Mock; refrescar: jest.Mock };
  let jwtServiceDePrueba: JwtService;

  const JWT_SECRET_DE_PRUEBA = 'secreto-de-pruebas-no-real';
  const expiresAt = new Date('2026-01-01T00:10:00.000Z');

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET_DE_PRUEBA;
    jwtServiceDePrueba = new JwtService({ secret: JWT_SECRET_DE_PRUEBA });

    authService = {
      login: jest.fn(),
      refrescar: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: JWT_SECRET_DE_PRUEBA }),
      ],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }, JwtStrategy],
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
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /auth/login devuelve { email, nombre, expiresAt } y setea la cookie access_token', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'token.de.login',
      admin: { email: 'admin@example.com', nombre: 'Admin' },
      expiresAt,
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'cualquier-contraseña' })
      .expect(200);

    expect(authService.login).toHaveBeenCalledWith(
      'admin@example.com',
      'cualquier-contraseña',
    );
    expect(response.body).toEqual({
      email: 'admin@example.com',
      nombre: 'Admin',
      expiresAt: expiresAt.toISOString(),
    });

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    expect(
      cookies.some((c: string) => c.startsWith('access_token=token.de.login')),
    ).toBe(true);
  });

  it('POST /auth/refresh sin cookie válida responde 401 (JwtAuthGuard) y no llama a refrescar()', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    expect(authService.refrescar).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh con un token expirado responde 401 sin gracia', async () => {
    const tokenExpirado = await jwtServiceDePrueba.signAsync(
      { sub: 'admin-uuid', email: 'admin@example.com' },
      { expiresIn: '-10s' },
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`access_token=${tokenExpirado}`])
      .expect(401);

    expect(authService.refrescar).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh con cookie válida responde 200, llama a refrescar(sub) y renueva la cookie', async () => {
    const tokenValido = await jwtServiceDePrueba.signAsync({
      sub: 'admin-uuid',
      email: 'admin@example.com',
    });

    authService.refrescar.mockResolvedValue({
      accessToken: 'token.de.refresh',
      admin: { email: 'admin@example.com', nombre: 'Admin' },
      expiresAt,
    });

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`access_token=${tokenValido}`])
      .expect(200);

    expect(authService.refrescar).toHaveBeenCalledWith('admin-uuid');
    expect(response.body).toEqual({
      email: 'admin@example.com',
      nombre: 'Admin',
      expiresAt: expiresAt.toISOString(),
    });

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    expect(
      cookies.some((c: string) =>
        c.startsWith('access_token=token.de.refresh'),
      ),
    ).toBe(true);
  });
});
