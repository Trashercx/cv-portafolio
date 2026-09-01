import { Module } from '@nestjs/common';
import { CertificacionesAdminController } from './certificaciones-admin.controller';
import { CertificacionesService } from './certificaciones.service';

/**
 * Sin controlador público propio desde Sprint 4 (UC-12/UC-13): el detalle
 * de una certificación para el visitante se sirve desde `PublicoModule`
 * (`GET /certificaciones/:id`) contra el snapshot publicado, nunca contra
 * esta tabla en vivo — ver `docs/plan-tecnico.md`, Sprint 4.
 */
@Module({
  controllers: [CertificacionesAdminController],
  providers: [CertificacionesService],
  exports: [CertificacionesService],
})
export class CertificacionesModule {}
