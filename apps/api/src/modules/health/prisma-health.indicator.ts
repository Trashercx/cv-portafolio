import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

/** Indicador de readiness (Fase 6): ejecuta `SELECT 1` vía Prisma. */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async estaVivo(clave = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(clave, true);
    } catch (error) {
      // `/health/ready` es público: el detalle del error (host, puerto, driver)
      // va solo al log, nunca a la respuesta (revisión Fase 6).
      this.logger.error(
        `Readiness de Prisma falló: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HealthCheckError(
        'Prisma no responde',
        this.getStatus(clave, false),
      );
    }
  }
}
