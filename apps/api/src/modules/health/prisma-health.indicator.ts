import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

/** Indicador de readiness (Fase 6): ejecuta `SELECT 1` vía Prisma. */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async estaVivo(clave = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(clave, true);
    } catch (error) {
      throw new HealthCheckError(
        'Prisma no responde',
        this.getStatus(clave, false, {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}
