import { Module } from '@nestjs/common';
import { PlataformasRedAdminController } from './plataformas-red-admin.controller';
import { PlataformasRedService } from './plataformas-red.service';
import { RedesSocialesAdminController } from './redes-sociales-admin.controller';
import { RedesSocialesService } from './redes-sociales.service';

/**
 * Sin controlador público propio desde Sprint 4 (UC-14): `GET /redes` para
 * el visitante se sirve desde `PublicoModule` contra el snapshot publicado
 * (`redes_sociales`), nunca contra esta tabla en vivo. Ver
 * `docs/plan-tecnico.md`, Sprint 4.
 */
@Module({
  controllers: [RedesSocialesAdminController, PlataformasRedAdminController],
  providers: [RedesSocialesService, PlataformasRedService],
  exports: [RedesSocialesService],
})
export class RedesSocialesModule {}
