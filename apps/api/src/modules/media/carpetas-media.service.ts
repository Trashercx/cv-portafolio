import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCarpetaMediaDto,
  MoverMediaDto,
  UpdateCarpetaMediaDto,
} from './dto/carpeta-media.dto';

const MSG_DUPLICADA = 'Ya existe una carpeta con ese nombre';

/**
 * Carpetas planas de la biblioteca (UC-09 ext., Fase 7e). Son organización del
 * panel, no del bucket S3. El nombre es único por administrador sin distinguir
 * mayúsculas (índice funcional `carpeta_media_admin_nombre_unico`).
 */
@Injectable()
export class CarpetasMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioAdminId: string) {
    const carpetas = await this.prisma.carpetaMedia.findMany({
      where: { usuario_admin_id: usuarioAdminId },
      orderBy: [{ orden: 'asc' }, { created_at: 'asc' }],
      include: { _count: { select: { medias: true } } },
    });
    return carpetas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      orden: c.orden,
      total: c._count.medias,
    }));
  }

  async crear(usuarioAdminId: string, dto: CreateCarpetaMediaDto) {
    await this.asegurarNombreLibre(usuarioAdminId, dto.nombre);
    const max = await this.prisma.carpetaMedia.aggregate({
      where: { usuario_admin_id: usuarioAdminId },
      _max: { orden: true },
    });
    try {
      const c = await this.prisma.carpetaMedia.create({
        data: {
          usuario_admin_id: usuarioAdminId,
          nombre: dto.nombre,
          orden: (max._max.orden ?? -1) + 1,
        },
      });
      return { id: c.id, nombre: c.nombre, orden: c.orden, total: 0 };
    } catch (error) {
      throw this.traducir(error);
    }
  }

  async actualizar(
    usuarioAdminId: string,
    id: string,
    dto: UpdateCarpetaMediaDto,
  ) {
    await this.obtener(usuarioAdminId, id);
    if (dto.nombre !== undefined) {
      await this.asegurarNombreLibre(usuarioAdminId, dto.nombre, id);
    }
    try {
      const c = await this.prisma.carpetaMedia.update({
        where: { id },
        data: { nombre: dto.nombre, orden: dto.orden },
        include: { _count: { select: { medias: true } } },
      });
      return {
        id: c.id,
        nombre: c.nombre,
        orden: c.orden,
        total: c._count.medias,
      };
    } catch (error) {
      throw this.traducir(error);
    }
  }

  /** Los archivos quedan con `carpeta_id` null por `ON DELETE SET NULL`. */
  async eliminar(usuarioAdminId: string, id: string) {
    await this.obtener(usuarioAdminId, id);
    await this.prisma.carpetaMedia.delete({ where: { id } });
    return { eliminado: true };
  }

  async reordenar(usuarioAdminId: string, ids: string[]) {
    const unicos = [...new Set(ids)];
    const existentes = await this.prisma.carpetaMedia.findMany({
      where: { id: { in: unicos }, usuario_admin_id: usuarioAdminId },
      select: { id: true },
    });
    if (existentes.length !== unicos.length) {
      throw new NotFoundException('Alguna carpeta no existe');
    }
    await this.prisma.$transaction(
      unicos.map((id, indice) =>
        this.prisma.carpetaMedia.update({
          where: { id },
          data: { orden: indice },
        }),
      ),
    );
    return this.listar(usuarioAdminId);
  }

  /** Mueve en lote; ids inexistentes se ignoran. `carpeta_id` null = sin carpeta. */
  async mover(usuarioAdminId: string, dto: MoverMediaDto) {
    if (dto.carpeta_id) await this.obtener(usuarioAdminId, dto.carpeta_id);
    const { count } = await this.prisma.media.updateMany({
      where: {
        id: { in: [...new Set(dto.ids)] },
        usuario_admin_id: usuarioAdminId,
      },
      data: { carpeta_id: dto.carpeta_id },
    });
    return { movidos: count };
  }

  /** Verifica que la carpeta exista y sea del admin; 404 si no. */
  async obtener(usuarioAdminId: string, id: string) {
    const carpeta = await this.prisma.carpetaMedia.findFirst({
      where: { id, usuario_admin_id: usuarioAdminId },
    });
    if (!carpeta) {
      throw new NotFoundException(`No existe la carpeta con id ${id}`);
    }
    return carpeta;
  }

  private async asegurarNombreLibre(
    usuarioAdminId: string,
    nombre: string,
    exceptoId?: string,
  ) {
    const existente = await this.prisma.carpetaMedia.findFirst({
      where: {
        usuario_admin_id: usuarioAdminId,
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(exceptoId ? { id: { not: exceptoId } } : {}),
      },
      select: { id: true },
    });
    if (existente) throw new ConflictException(MSG_DUPLICADA);
  }

  /** Carrera entre la comprobación y el índice único: P2002 → 409. */
  private traducir(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(MSG_DUPLICADA);
    }
    return error;
  }
}
