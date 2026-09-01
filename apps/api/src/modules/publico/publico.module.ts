import { Module } from '@nestjs/common';
import { VersionesSitioModule } from '../versiones-sitio/versiones-sitio.module';
import { PublicoController } from './publico.controller';

/**
 * Agregador de endpoints de visitante (UC-12 a UC-14, ver
 * docs/plan-tecnico.md). Ninguna ruta de este módulo lleva `@UseGuards`
 * ni depende de un guard global (no existe ninguno en `AppModule`/`main.ts`),
 * así que queda pública por construcción.
 */
@Module({
  imports: [VersionesSitioModule],
  controllers: [PublicoController],
})
export class PublicoModule {}
