import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Envoltura de PrismaClient como provider de Nest.
 *
 * Prisma 7 requiere un driver adapter explícito (ya no basta con `url` en
 * schema.prisma) — ver `apps/api/prisma7.config.ts` para la config de
 * conexión que usa el CLI de Prisma. Aquí instanciamos el mismo adapter
 * (`@prisma/adapter-pg`) para que el runtime de NestJS use la misma
 * conexión Postgres.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
