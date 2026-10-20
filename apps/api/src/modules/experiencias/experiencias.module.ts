import { Module } from '@nestjs/common';
import { ExperienciasAdminController } from './experiencias-admin.controller';
import { ExperienciasService } from './experiencias.service';

/**
 * UC-19 (Fase 7l). Sin controlador público: el visitante recibe las
 * experiencias dentro del snapshot (`GET /sitio`), nunca la tabla en vivo.
 */
@Module({
  controllers: [ExperienciasAdminController],
  providers: [ExperienciasService],
  exports: [ExperienciasService],
})
export class ExperienciasModule {}
