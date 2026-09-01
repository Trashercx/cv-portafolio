import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificacionesService } from '../certificaciones/certificaciones.service';
import { LogrosService } from '../logros/logros.service';
import { PerfilService } from '../perfil/perfil.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { RedesSocialesService } from '../redes-sociales/redes-sociales.service';
import { SeccionesService } from '../secciones/secciones.service';
import { TemaService } from '../tema/tema.service';
import {
  ESTADO_BORRADOR,
  ESTADO_PUBLICADO,
  SnapshotSitio,
} from './snapshot.types';

/**
 * UC-10 (Previsualizar cambios) y UC-11 (Publicar o revertir una versión).
 *
 * Decisión de arquitectura central (docs/plan-tecnico.md, Sprint 4): el sitio
 * público (UC-12) SIEMPRE lee de `VersionSitio.snapshot`, nunca de las tablas
 * de contenido en vivo. Este servicio es el único lugar que arma ese
 * snapshot, reutilizando los servicios ya existentes de cada módulo de
 * contenido (sin duplicar queries de Prisma) para que la forma del snapshot
 * quede alineada con lo que cada endpoint admin ya devuelve.
 */
@Injectable()
export class VersionesSitioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perfilService: PerfilService,
    private readonly seccionesService: SeccionesService,
    private readonly temaService: TemaService,
    private readonly proyectosService: ProyectosService,
    private readonly certificacionesService: CertificacionesService,
    private readonly logrosService: LogrosService,
    private readonly redesSocialesService: RedesSocialesService,
  ) {}

  /**
   * Arma la "foto" completa del sitio a partir del estado actual del
   * contenido en vivo. Reutilizada tanto por `preview()` como por
   * `publicar()` para que ambos flujos produzcan exactamente el mismo
   * snapshot a partir del mismo estado (la única diferencia entre ambos es
   * el `estado`/`publicado_en` de la fila `VersionSitio` resultante).
   *
   * Incluye las secciones no visibles también (el filtrado por `visible` lo
   * hace el consumidor del snapshot, no el armado): el panel de preview
   * puede querer mostrarlas atenuadas, y el sitio público simplemente no
   * las renderiza.
   */
  private async armarSnapshot(usuarioAdminId: string): Promise<SnapshotSitio> {
    const [
      perfil,
      tema,
      secciones,
      proyectos,
      certificaciones,
      logros,
      redes_sociales,
    ] = await Promise.all([
      this.perfilService.obtenerConMedia(usuarioAdminId),
      this.temaService.obtenerActivo(usuarioAdminId),
      this.seccionesService.listar(),
      this.proyectosService.listarAdmin(),
      this.certificacionesService.listarConLogo(),
      this.logrosService.listar(),
      this.redesSocialesService.listar(),
    ]);

    return {
      perfil,
      tema,
      secciones,
      proyectos,
      certificaciones,
      logros,
      redes_sociales,
    } as unknown as SnapshotSitio;
  }

  /**
   * `POST /admin/versiones/preview` (UC-10): arma el snapshot y lo guarda
   * como una fila `borrador` (para dejar rastro de qué se previsualizó),
   * pero devuelve el snapshot armado — es lo que el frontend usa para
   * renderizar la vista previa, sin volver a pedirlo.
   */
  async preview(usuarioAdminId: string) {
    const snapshot = await this.armarSnapshot(usuarioAdminId);

    return this.prisma.versionSitio.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        estado: ESTADO_BORRADOR,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * `POST /admin/versiones/publicar` (UC-11): mismo snapshot que `preview()`,
   * pero como fila `publicado` con `publicado_en=now()`. A partir de esta
   * llamada, esta fila es "la versión pública vigente" (la que devuelve
   * `GET /sitio`).
   */
  async publicar(usuarioAdminId: string) {
    const snapshot = await this.armarSnapshot(usuarioAdminId);

    return this.prisma.versionSitio.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        estado: ESTADO_PUBLICADO,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        publicado_en: new Date(),
      },
    });
  }

  /**
   * `POST /admin/versiones/:id/revertir` (UC-11): busca la versión publicada
   * inmediatamente anterior a `id` y crea una NUEVA fila copiando su
   * snapshot, con `estado='publicado'` y `publicado_en` nuevo. Nunca muta
   * una fila existente — el historial completo queda preservado.
   */
  async revertir(id: string) {
    const objetivo = await this.prisma.versionSitio.findUnique({
      where: { id },
    });

    if (!objetivo) {
      throw new NotFoundException(`No existe una versión con id ${id}`);
    }

    const anterior = await this.prisma.versionSitio.findFirst({
      where: {
        estado: ESTADO_PUBLICADO,
        id: { not: id },
        // Si `objetivo` es a su vez una versión publicada (el caso típico:
        // "revertir la publicación actual"), solo cuentan como "anteriores"
        // las publicadas ANTES de ella. Si `objetivo` es un borrador (sin
        // publicado_en), no hay una fecha de referencia clara, así que se
        // toma directamente la última publicada existente.
        ...(objetivo.publicado_en
          ? { publicado_en: { lt: objetivo.publicado_en } }
          : {}),
      },
      orderBy: { publicado_en: 'desc' },
    });

    if (!anterior) {
      throw new ConflictException(
        'No existe una versión publicada anterior a la cual revertir',
      );
    }

    return this.prisma.versionSitio.create({
      data: {
        usuario_admin_id: anterior.usuario_admin_id,
        estado: ESTADO_PUBLICADO,
        snapshot: anterior.snapshot as Prisma.InputJsonValue,
        publicado_en: new Date(),
      },
    });
  }

  /**
   * `GET /admin/versiones` (UC-11): historial completo, más reciente
   * primero. Los borradores no tienen `publicado_en` (columna nullable, ver
   * schema.prisma): se ordenan al final por fecha, y entre ellos por `id`
   * como orden natural estable (no se agregan columnas nuevas solo para
   * esto).
   */
  async listar() {
    const versiones = await this.prisma.versionSitio.findMany();

    return [...versiones].sort((a, b) => {
      const fechaA = a.publicado_en?.getTime() ?? -Infinity;
      const fechaB = b.publicado_en?.getTime() ?? -Infinity;

      if (fechaB !== fechaA) return fechaB - fechaA;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * UC-12: "la" versión pública vigente — la fila `publicado` de
   * `publicado_en` más reciente. Reutilizada por `PublicoModule` para que
   * ningún otro lugar del código repita este criterio de selección.
   */
  async obtenerUltimaPublicada() {
    return this.prisma.versionSitio.findFirst({
      where: { estado: ESTADO_PUBLICADO },
      orderBy: { publicado_en: 'desc' },
    });
  }
}
