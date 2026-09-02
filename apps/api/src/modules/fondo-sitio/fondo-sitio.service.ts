import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFondoSitioDto } from './dto/create-fondo-sitio.dto';
import { UpdateFondoSitioDto } from './dto/update-fondo-sitio.dto';

@Injectable()
export class FondoSitioService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.fondoSitio.findMany({ orderBy: { tipo: 'asc' } });
  }

  /**
   * UC-10/UC-11 (Sprint 4): el fondo activo (o `null` si ninguno lo está)
   * tal como lo necesita `VersionesSitioService.armarSnapshot()` — mismo
   * patrón que `TemaService.obtenerActivo`.
   */
  async obtenerActivo(usuarioAdminId: string) {
    return this.prisma.fondoSitio.findFirst({
      where: { usuario_admin_id: usuarioAdminId, activo: true },
    });
  }

  async obtener(id: string) {
    const fondo = await this.prisma.fondoSitio.findUnique({ where: { id } });

    if (!fondo) {
      throw new NotFoundException(`No existe un fondo con id ${id}`);
    }

    return fondo;
  }

  /** Siempre se crea inactivo — ver comentario de `CreateFondoSitioDto`. */
  async crear(usuarioAdminId: string, dto: CreateFondoSitioDto) {
    return this.prisma.fondoSitio.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        tipo: dto.tipo,
        configuracion: dto.configuracion as unknown as Prisma.InputJsonValue,
        activo: false,
      },
    });
  }

  async actualizar(id: string, dto: UpdateFondoSitioDto) {
    await this.obtener(id);

    return this.prisma.fondoSitio.update({
      where: { id },
      data: {
        ...dto,
        configuracion: dto.configuracion
          ? (dto.configuracion as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.fondoSitio.delete({ where: { id } });
  }

  /**
   * `PATCH /admin/fondos/:id/activar` (UC-15): "Un fondo guardado y marcado
   * como activo se aplica de inmediato a la vista previa del sitio... solo
   * un fondo puede estar activo a la vez."
   *
   * Regla de negocio (docs/plan-portafolio.md sección 4): solo un
   * `FondoSitio` por administrador puede tener `activo = true` a la vez. El
   * índice único parcial en Postgres (`WHERE activo = true`) es el respaldo
   * final, pero aquí se aplica la regla de forma explícita y atómica: dentro
   * de una única transacción se desactiva cualquier otro fondo activo del
   * mismo administrador y luego se activa este. Mismo patrón exacto que
   * `TemaService.activar`.
   */
  async activar(id: string) {
    const fondo = await this.obtener(id);

    const [, fondoActivado] = await this.prisma.$transaction([
      this.prisma.fondoSitio.updateMany({
        where: {
          usuario_admin_id: fondo.usuario_admin_id,
          activo: true,
          NOT: { id: fondo.id },
        },
        data: { activo: false },
      }),
      this.prisma.fondoSitio.update({
        where: { id: fondo.id },
        data: { activo: true },
      }),
    ]);

    return fondoActivado;
  }
}
