import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCertificacionDto } from './dto/create-certificacion.dto';
import { UpdateCertificacionDto } from './dto/update-certificacion.dto';

/**
 * Criterio de orden (UC-04, docs/plan-portafolio.md: "ordenadas por fecha o
 * orden manual"): se ordena primero por `orden` ascendente (orden manual,
 * es el criterio explícito del admin) y, como desempate para certificaciones
 * con el mismo `orden` (p. ej. varias creadas con el valor por defecto),
 * por `fecha_emision` descendente (la más reciente primero). Como `orden`
 * es un campo obligatorio en el esquema (nunca queda "sin setear"), este
 * es el único criterio que aplica en la práctica; se documenta así para
 * dejar explícito qué pasa si dos filas comparten `orden`.
 */
const ORDEN_CERTIFICACIONES = [
  { orden: 'asc' as const },
  { fecha_emision: 'desc' as const },
];

@Injectable()
export class CertificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.certificacion.findMany({
      orderBy: ORDEN_CERTIFICACIONES,
    });
  }

  /**
   * UC-10/UC-11 (Sprint 4): variante de `listar()` con el logo (`Media`)
   * resuelto, usada por `VersionesSitioService.armarSnapshot()` — el
   * snapshot publicado debe traer la URL del logo, no solo `logo_media_id`.
   */
  async listarConLogo() {
    return this.prisma.certificacion.findMany({
      orderBy: ORDEN_CERTIFICACIONES,
      include: { logo: true },
    });
  }

  async obtener(id: string) {
    const certificacion = await this.prisma.certificacion.findUnique({
      where: { id },
    });

    if (!certificacion) {
      throw new NotFoundException(`No existe una certificación con id ${id}`);
    }

    return certificacion;
  }

  /**
   * `fecha_emision`/`fecha_expiracion` llegan del DTO como string
   * `YYYY-MM-DD` (`@IsDateString()`, sin `@Type(() => Date)`): el cliente de
   * Prisma 7 exige un ISO-8601 DateTime completo (con hora) para columnas
   * `@db.Date` y rechaza un string solo-fecha con "premature end of input",
   * por eso se convierten explícitamente a `Date` antes de llegar a Prisma.
   */
  async crear(usuarioAdminId: string, dto: CreateCertificacionDto) {
    await this.validarLogo(dto.logo_media_id);

    return this.prisma.certificacion.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        ...dto,
        fecha_emision: new Date(dto.fecha_emision),
        fecha_expiracion: dto.fecha_expiracion
          ? new Date(dto.fecha_expiracion)
          : undefined,
      },
    });
  }

  async actualizar(id: string, dto: UpdateCertificacionDto) {
    await this.obtener(id);
    await this.validarLogo(dto.logo_media_id);

    return this.prisma.certificacion.update({
      where: { id },
      data: {
        ...dto,
        fecha_emision: dto.fecha_emision
          ? new Date(dto.fecha_emision)
          : undefined,
        fecha_expiracion: dto.fecha_expiracion
          ? new Date(dto.fecha_expiracion)
          : undefined,
      },
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.certificacion.delete({ where: { id } });
  }

  private async validarLogo(logoMediaId?: string) {
    if (!logoMediaId) return;

    const media = await this.prisma.media.findUnique({
      where: { id: logoMediaId },
    });
    if (!media) {
      throw new BadRequestException(`No existe Media con id ${logoMediaId}`);
    }
  }
}
