import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /admin/skills` (UC-16): ordenados por `orden` ascendente. */
  async listar() {
    return this.prisma.skill.findMany({ orderBy: { orden: 'asc' } });
  }

  async obtener(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });

    if (!skill) {
      throw new NotFoundException(`No existe un skill con id ${id}`);
    }

    return skill;
  }

  /**
   * Busca un skill del mismo admin cuyo nombre coincida sin distinguir
   * mayúsculas/minúsculas (mismo criterio que el índice único parcial
   * `skill_admin_nombre_unico`), opcionalmente excluyendo una fila — usado
   * por `actualizar()` para que renombrar un skill a su propio nombre
   * actual no dispare un falso conflicto.
   */
  private async buscarDuplicado(
    usuarioAdminId: string,
    nombre: string,
    idAExcluir?: string,
  ) {
    return this.prisma.skill.findFirst({
      where: {
        usuario_admin_id: usuarioAdminId,
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(idAExcluir ? { id: { not: idAExcluir } } : {}),
      },
    });
  }

  /**
   * Traduce un P2002 (constraint única `skill_admin_nombre_unico`) a un
   * ConflictException legible. El chequeo previo con `buscarDuplicado` cubre
   * el caso común, pero no elimina la condición de carrera entre dos
   * requests concurrentes: si ambas pasan el chequeo y llegan al
   * create/update, Prisma solo puede rechazar la segunda con P2002 — este
   * helper es la red de seguridad para ese caso. Solo captura ese código
   * específico; cualquier otro error se re-lanza tal cual, para no
   * disfrazar un 500 real como un 409.
   *
   * Nota de diseño: no existía un precedente de manejo de P2002 en el
   * proyecto (TEMA/FONDO_SITIO usan su índice único parcial solo como
   * garantía de última línea, sin capturarlo en el servicio), así que este
   * es el primer lugar donde se introduce el patrón.
   */
  private relanzarComoConflicto(error: unknown, nombre: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(`Ya existe un skill llamado "${nombre}".`);
    }

    throw error;
  }

  async crear(usuarioAdminId: string, dto: CreateSkillDto) {
    const nombre = dto.nombre.trim();
    const duplicado = await this.buscarDuplicado(usuarioAdminId, nombre);

    if (duplicado) {
      throw new ConflictException(
        `Ya existe un skill llamado "${duplicado.nombre}".`,
      );
    }

    try {
      return await this.prisma.skill.create({
        data: { usuario_admin_id: usuarioAdminId, ...dto, nombre },
      });
    } catch (error) {
      this.relanzarComoConflicto(error, nombre);
    }
  }

  async actualizar(id: string, dto: UpdateSkillDto) {
    const skillActual = await this.obtener(id);
    const nombre = dto.nombre !== undefined ? dto.nombre.trim() : undefined;

    if (nombre !== undefined) {
      const duplicado = await this.buscarDuplicado(
        skillActual.usuario_admin_id,
        nombre,
        id,
      );

      if (duplicado) {
        throw new ConflictException(
          `Ya existe un skill llamado "${duplicado.nombre}".`,
        );
      }
    }

    try {
      return await this.prisma.skill.update({
        where: { id },
        data: { ...dto, ...(nombre !== undefined ? { nombre } : {}) },
      });
    } catch (error) {
      this.relanzarComoConflicto(error, nombre ?? '');
    }
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.skill.delete({ where: { id } });
  }
}
