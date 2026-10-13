// Carga apps/api/.env antes que cualquier otro módulo lea process.env
// (PrismaService construye el adapter de Postgres en su constructor).
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Fase 6: bufferLogs retiene los logs de arranque hasta que pino esté listo.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Fase 6: en producción la API corre detrás de Traefik/Dokploy; solo con
  // TRUST_PROXY=true se confía en X-Forwarded-For (IP real para el rate limit).
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // Fase 6: cabeceras de seguridad. `cross-origin` en CORP para que /uploads
  // (fallback local de media) siga cargando desde el origen del frontend.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // Fase 6: cierre ordenado (SIGTERM de Docker) -> PrismaService.$disconnect().
  app.enableShutdownHooks();

  app.use(cookieParser());

  // Sirve los archivos subidos por LocalMediaStorageService, que desde
  // Sprint 3 ya no es el provider por defecto de `media` (lo es
  // S3MediaStorageService) pero se conserva como fallback de desarrollo sin
  // credenciales de AWS y como stub en tests. Ver
  // src/modules/media/storage/local-media-storage.service.ts.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // CORS: el frontend (Vite) corre en http://localhost:5173 por defecto.
  // Hardcodeado a propósito para desarrollo — parametrizar vía variable de
  // entorno (p. ej. FRONTEND_ORIGIN) antes de desplegar a producción.
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // whitelist + forbidNonWhitelisted: ningún campo fuera de los DTOs se acepta
  // en ningún endpoint, presente o futuro (regla del subagente backend-nestjs).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
