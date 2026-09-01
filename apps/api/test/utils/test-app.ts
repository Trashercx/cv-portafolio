import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Crea una instancia real de Nest (mismo pipeline que `main.ts`: cookie-parser +
 * ValidationPipe con whitelist/forbidNonWhitelisted/transform) para las pruebas
 * e2e de Sprint 1. Se usa en lugar de un mock porque los criterios de aceptación
 * de UC-02 a UC-06 dependen de comportamiento real (guards, DTOs, Prisma).
 *
 * `configurar` permite sobreescribir providers antes de compilar el módulo
 * (p. ej. `MEDIA_STORAGE_SERVICE` en `media.e2e-spec.ts`, para que ningún
 * test le pegue a S3 real) sin tener que duplicar todo el bootstrap.
 */
export async function crearAppDePrueba(
  configurar?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configurar) {
    builder = configurar(builder);
  }
  const moduleFixture = await builder.compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

/**
 * Inicia sesión como el único administrador sembrado (`ADMIN_EMAIL` /
 * `ADMIN_PASSWORD_SEED`, ver apps/api/.env y prisma/seed.ts) y devuelve un
 * `supertest.agent` que reenvía automáticamente la cookie httpOnly
 * `access_token` en cada request subsiguiente. Úsalo para las rutas
 * `/admin/*`; para las rutas públicas usa `request(app.getHttpServer())`
 * directamente, sin agente, para no llevar sesión.
 */
export async function agenteAutenticado(app: INestApplication) {
  const agent = request.agent(app.getHttpServer());

  await agent
    .post('/auth/login')
    .send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD_SEED,
    })
    .expect(200);

  return agent;
}
