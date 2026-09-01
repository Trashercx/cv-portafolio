import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { VersionesSitioService } from '../versiones-sitio/versiones-sitio.service';
import { SnapshotSitio } from '../versiones-sitio/snapshot.types';

/**
 * UC-12 (Ver el sitio publicado), UC-13 (Ver detalle de un proyecto o
 * certificación) y UC-14 (Acceder a redes y descargar el CV) — vista de
 * visitante, siempre pública (sin `JwtAuthGuard`, sin heredar ningún guard
 * de módulo padre).
 *
 * Decisión de arquitectura central (no negociable, docs/plan-tecnico.md
 * Sprint 4): TODAS las rutas de este controlador leen exclusivamente de
 * `VersionSitio.snapshot` con `estado='publicado'`, nunca de las tablas de
 * contenido en vivo. Si el admin edita algo y no publica, el visitante no
 * lo ve — ese es el criterio de aceptación literal de UC-12.
 */
@Controller()
export class PublicoController {
  constructor(private readonly versionesSitioService: VersionesSitioService) {}

  /** `GET /sitio` (UC-12): snapshot completo de la última versión publicada. */
  @Get('sitio')
  async obtenerSitio() {
    const snapshot = await this.obtenerSnapshotPublicadoOFallar();
    return snapshot;
  }

  /** `GET /proyectos/:id` (UC-13): detalle contra el snapshot publicado. */
  @Get('proyectos/:id')
  async obtenerProyecto(@Param('id', ParseUUIDPipe) id: string) {
    const snapshot = await this.obtenerSnapshotPublicadoOFallar();
    const proyecto = snapshot.proyectos?.find((p) => p.id === id);

    if (!proyecto) {
      throw new NotFoundException(
        `No existe un proyecto publicado con id ${id}`,
      );
    }

    return proyecto;
  }

  /** `GET /certificaciones/:id` (UC-13): detalle contra el snapshot publicado. */
  @Get('certificaciones/:id')
  async obtenerCertificacion(@Param('id', ParseUUIDPipe) id: string) {
    const snapshot = await this.obtenerSnapshotPublicadoOFallar();
    const certificacion = snapshot.certificaciones?.find((c) => c.id === id);

    if (!certificacion) {
      throw new NotFoundException(
        `No existe una certificación publicada con id ${id}`,
      );
    }

    return certificacion;
  }

  /** `GET /redes` (UC-14): enlaces de redes del snapshot publicado. */
  @Get('redes')
  async obtenerRedes() {
    const snapshot = await this.obtenerSnapshotPublicadoOFallar();
    return snapshot.redes_sociales ?? [];
  }

  /**
   * `GET /cv` (UC-14): redirige (302) a la URL de S3 del CV, ya resuelta
   * dentro del snapshot publicado (`perfil.cv_media.url`) — no vuelve a
   * tocar `Media` ni la tabla `Perfil` en vivo.
   */
  @Get('cv')
  async descargarCv(@Res() res: Response) {
    const snapshot = await this.obtenerSnapshotPublicadoOFallar();
    const url = snapshot.perfil?.cv_media?.url;

    if (!url) {
      throw new NotFoundException(
        'No hay un CV cargado en el perfil publicado',
      );
    }

    res.redirect(url);
  }

  private async obtenerSnapshotPublicadoOFallar(): Promise<SnapshotSitio> {
    const version = await this.versionesSitioService.obtenerUltimaPublicada();

    if (!version) {
      throw new NotFoundException(
        'El sitio todavía no tiene una versión publicada',
      );
    }

    return version.snapshot as unknown as SnapshotSitio;
  }
}
