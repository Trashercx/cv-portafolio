import { Injectable, NotFoundException } from '@nestjs/common';
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

  async crear(usuarioAdminId: string, dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: { usuario_admin_id: usuarioAdminId, ...dto },
    });
  }

  async actualizar(id: string, dto: UpdateSkillDto) {
    await this.obtener(id);
    return this.prisma.skill.update({ where: { id }, data: { ...dto } });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.skill.delete({ where: { id } });
  }
}
