import { Module } from '@nestjs/common';
import { ProyectosAdminController } from './proyectos-admin.controller';
import { ProyectosService } from './proyectos.service';

/**
 * Sin controlador público propio desde Sprint 4 (UC-12/UC-13): el listado
 * completo se sirve como parte del snapshot en `GET /sitio` y el detalle en
 * `GET /proyectos/:id` (ambos en `PublicoModule`), siempre contra la última
 * versión publicada — nunca contra esta tabla en vivo. Ver
 * `docs/plan-tecnico.md`, Sprint 4, y el comentario de
 * `VersionesSitioService.armarSnapshot()`.
 */
@Module({
  controllers: [ProyectosAdminController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}
