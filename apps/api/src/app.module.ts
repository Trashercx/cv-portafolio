import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CertificacionesModule } from './modules/certificaciones/certificaciones.module';
import { FondoSitioModule } from './modules/fondo-sitio/fondo-sitio.module';
import { LogrosModule } from './modules/logros/logros.module';
import { MediaModule } from './modules/media/media.module';
import { MetricasModule } from './modules/metricas/metricas.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { PublicoModule } from './modules/publico/publico.module';
import { RedesSocialesModule } from './modules/redes-sociales/redes-sociales.module';
import { SeccionesModule } from './modules/secciones/secciones.module';
import { SeoModule } from './modules/seo/seo.module';
import { SkillsModule } from './modules/skills/skills.module';
import { TecnologiasModule } from './modules/tecnologias/tecnologias.module';
import { TemaModule } from './modules/tema/tema.module';
import { VersionesSitioModule } from './modules/versiones-sitio/versiones-sitio.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Fase 6: logging estructurado. JSON en producción, pino-pretty en
    // desarrollo, silencioso en tests. Redacta cookies y credenciales.
    LoggerModule.forRoot({
      pinoHttp: {
        level:
          process.env.NODE_ENV === 'test'
            ? 'silent'
            : (process.env.LOG_LEVEL ?? 'info'),
        transport:
          process.env.NODE_ENV === 'production' ||
          process.env.NODE_ENV === 'test'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        genReqId: (req, res) => {
          const entrante = req.headers['x-request-id'];
          // Solo se reutiliza un id entrante corto y de caracteres seguros: evita
          // inflar los logs o falsear correlaciones desde el cliente (revisión Fase 6).
          const id =
            typeof entrante === 'string' &&
            /^[A-Za-z0-9._-]{1,64}$/.test(entrante)
              ? entrante
              : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers["set-cookie"]',
        ],
        autoLogging: {
          ignore: (req) => (req.url ?? '').startsWith('/health'),
        },
      },
    }),
    // Fase 6: rate limiting global por IP; /auth/login lleva un límite más
    // estricto con @Throttle. Sobreescribible con THROTTLE_TTL_MS / THROTTLE_LIMIT.
    // forRootAsync: lee el entorno al compilar el módulo (no al importar el
    // archivo), para que los e2e puedan ajustar los límites.
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
          limit: Number(process.env.THROTTLE_LIMIT ?? 120),
        },
      ],
    }),
    HealthModule,
    PrismaModule,
    AuthModule,
    MediaModule,
    PerfilModule,
    ProyectosModule,
    TecnologiasModule,
    CertificacionesModule,
    LogrosModule,
    RedesSocialesModule,
    SeccionesModule,
    TemaModule,
    SkillsModule,
    FondoSitioModule,
    VersionesSitioModule,
    PublicoModule,
    // Fase 8: metadatos SEO en servidor (UC-34) y métricas de Umami (UC-27).
    SeoModule,
    MetricasModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
