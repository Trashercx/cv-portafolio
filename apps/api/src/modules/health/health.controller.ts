import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from './prisma-health.indicator';

/**
 * Fase 6: health checks para Docker/Dokploy. Públicos, sin guard y fuera del
 * rate limit (los sondea la plataforma con frecuencia).
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  /** Liveness: no toca la base de datos. */
  @Get()
  liveness() {
    return { status: 'ok' };
  }

  /** Readiness: verifica la conexión a Postgres con `SELECT 1`. */
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.prismaIndicator.estaVivo()]);
  }
}
