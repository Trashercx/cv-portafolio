import { HealthCheckError } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

describe('PrismaHealthIndicator (Fase 6)', () => {
  it('reporta up cuando SELECT 1 responde', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const indicador = new PrismaHealthIndicator(prisma as never);
    await expect(indicador.estaVivo()).resolves.toEqual({
      database: { status: 'up' },
    });
  });

  it('lanza HealthCheckError (status down) cuando la consulta falla', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('caído')),
    };
    const indicador = new PrismaHealthIndicator(prisma as never);
    const error = await indicador.estaVivo().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HealthCheckError);
    expect((error as HealthCheckError).causes.database.status).toBe('down');
  });
});
