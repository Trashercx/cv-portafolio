import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemaDto } from './dto/create-tema.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';

@Injectable()
export class TemaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.tema.findMany({ orderBy: { nombre: 'asc' } });
  }

  async obtener(id: string) {
    const tema = await this.prisma.tema.findUnique({ where: { id } });

    if (!tema) {
      throw new NotFoundException(`No existe un tema con id ${id}`);
    }

    return tema;
  }

  /** Siempre se crea inactivo — ver comentario de `CreateTemaDto`. */
  async crear(usuarioAdminId: string, dto: CreateTemaDto) {
    return this.prisma.tema.create({
      data: { usuario_admin_id: usuarioAdminId, ...dto, activo: false },
    });
  }

  async actualizar(id: string, dto: UpdateTemaDto) {
    await this.obtener(id);

    return this.prisma.tema.update({ where: { id }, data: { ...dto } });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.tema.delete({ where: { id } });
  }

  /**
   * `PATCH /admin/temas/:id/activar` (UC-08): "Un tema guardado y marcado
   * como activo se aplica de inmediato a la vista previa del sitio."
   *
   * Regla de negocio (docs/plan-portafolio.md sección 4): solo un `Tema` por
   * administrador puede tener `activo = true` a la vez. El índice único
   * parcial en Postgres (`WHERE activo = true`, ver la migración de
   * Sprint 0) es el respaldo final, pero aquí se aplica la regla de forma
   * explícita y atómica: dentro de una única transacción se desactiva
   * cualquier otro tema activo del mismo administrador y luego se activa
   * este, así una activación concurrente nunca deja dos temas activos ni
   * viola el índice a mitad de camino.
   */
  async activar(id: string) {
    const tema = await this.obtener(id);

    const [, temaActivado] = await this.prisma.$transaction([
      this.prisma.tema.updateMany({
        where: {
          usuario_admin_id: tema.usuario_admin_id,
          activo: true,
          NOT: { id: tema.id },
        },
        data: { activo: false },
      }),
      this.prisma.tema.update({
        where: { id: tema.id },
        data: { activo: true },
      }),
    ]);

    return temaActivado;
  }
}
