import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global de acceso a datos. Se importa una sola vez en AppModule;
 * cualquier otro módulo puede inyectar `PrismaService` sin reimportarlo.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
