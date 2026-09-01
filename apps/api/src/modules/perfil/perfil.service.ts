import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertPerfilDto } from './dto/upsert-perfil.dto';

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * UC-02: `Perfil` es una fila única por administrador. Devuelve `null`
   * (200) cuando todavía no se configuró — no es un error, es el estado
   * inicial antes del primer `PUT`.
   */
  async obtener(usuarioAdminId: string) {
    return this.prisma.perfil.findUnique({
      where: { usuario_admin_id: usuarioAdminId },
    });
  }

  /**
   * UC-10/UC-11 (Sprint 4): variante de `obtener()` con las relaciones de
   * media resueltas (`imagen_perfil`, `cv_media`), usada por
   * `VersionesSitioService.armarSnapshot()` para que el snapshot publicado
   * traiga la URL de la foto de perfil y del CV sin que el consumidor del
   * snapshot (panel de preview o sitio público) tenga que resolver el id
   * contra `Media` por su cuenta.
   */
  async obtenerConMedia(usuarioAdminId: string) {
    return this.prisma.perfil.findUnique({
      where: { usuario_admin_id: usuarioAdminId },
      include: { imagen_perfil: true, cv_media: true },
    });
  }

  /**
   * Upsert real: crea la fila si no existe, la actualiza si ya existe.
   * Nunca puede terminar en dos filas para el mismo admin porque
   * `usuario_admin_id` es `@unique` en el esquema y Prisma resuelve el
   * upsert de forma atómica sobre esa restricción.
   */
  async upsert(usuarioAdminId: string, dto: UpsertPerfilDto) {
    await this.validarMediaReferenciada(dto);

    return this.prisma.perfil.upsert({
      where: { usuario_admin_id: usuarioAdminId },
      create: { usuario_admin_id: usuarioAdminId, ...dto },
      update: { ...dto },
    });
  }

  /**
   * `imagen_perfil_id`/`cv_media_id` son FKs opcionales a `Media`. Se
   * verifican antes del upsert para devolver un 400 claro en vez de dejar
   * que una violación de FK de Postgres se filtre como 500.
   */
  private async validarMediaReferenciada(dto: UpsertPerfilDto) {
    const ids = [dto.imagen_perfil_id, dto.cv_media_id].filter(
      (id): id is string => Boolean(id),
    );

    if (ids.length === 0) return;

    const encontrados = await this.prisma.media.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const encontradosIds = new Set(encontrados.map((m) => m.id));
    const faltantes = ids.filter((id) => !encontradosIds.has(id));

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No existe Media con id: ${faltantes.join(', ')}`,
      );
    }
  }
}
