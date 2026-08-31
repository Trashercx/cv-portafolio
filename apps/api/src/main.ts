// Carga apps/api/.env antes que cualquier otro módulo lea process.env
// (PrismaService construye el adapter de Postgres en su constructor).
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

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
