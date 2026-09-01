import { Module } from '@nestjs/common';
import { LogrosAdminController } from './logros-admin.controller';
import { LogrosService } from './logros.service';

/**
 * Sin controlador público propio desde Sprint 4 (UC-12): los logros del
 * visitante se sirven como parte del snapshot en `GET /sitio`
 * (`PublicoModule`), nunca contra esta tabla en vivo. Ver
 * `docs/plan-tecnico.md`, Sprint 4.
 */
@Module({
  controllers: [LogrosAdminController],
  providers: [LogrosService],
  exports: [LogrosService],
})
export class LogrosModule {}
