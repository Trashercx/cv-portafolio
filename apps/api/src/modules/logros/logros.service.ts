import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLogroDto } from './dto/create-logro.dto';
import { UpdateLogroDto } from './dto/update-logro.dto';

@Injectable()
export class LogrosService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /logros` (UC-05): ordenados por `orden` ascendente. */
  async listar() {
    return this.prisma.logro.findMany({ orderBy: { orden: 'asc' } });
  }

  async obtener(id: string) {
    const logro = await this.prisma.logro.findUnique({ where: { id } });

    if (!logro) {
      throw new NotFoundException(`No existe un logro con id ${id}`);
    }

    return logro;
  }

  /**
   * `fecha` llega del DTO como string `YYYY-MM-DD` (`@IsDateString()`, sin
   * `@Type(() => Date)`): el cliente de Prisma 7 exige un ISO-8601 DateTime
   * completo (con hora) para columnas `@db.Date` y rechaza un string
   * solo-fecha con "premature end of input", por eso se convierte
   * explícitamente a `Date` antes de llegar a Prisma.
   */
  async crear(usuarioAdminId: string, dto: CreateLogroDto) {
    return this.prisma.logro.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        ...dto,
        fecha: new Date(dto.fecha),
      },
    });
  }

  async actualizar(id: string, dto: UpdateLogroDto) {
    await this.obtener(id);
    return this.prisma.logro.update({
      where: { id },
      data: { ...dto, fecha: dto.fecha ? new Date(dto.fecha) : undefined },
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.logro.delete({ where: { id } });
  }
}
