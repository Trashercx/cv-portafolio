import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRedSocialDto } from './dto/create-red-social.dto';
import { UpdateRedSocialDto } from './dto/update-red-social.dto';

const INCLUDE_PLATAFORMA = { plataforma: true };

@Injectable()
export class RedesSocialesService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /redes` (UC-06): con la plataforma incluida (nombre + icono). */
  async listar() {
    return this.prisma.redSocial.findMany({
      orderBy: { orden: 'asc' },
      include: INCLUDE_PLATAFORMA,
    });
  }

  async obtener(id: string) {
    const red = await this.prisma.redSocial.findUnique({
      where: { id },
      include: INCLUDE_PLATAFORMA,
    });

    if (!red) {
      throw new NotFoundException(`No existe una red social con id ${id}`);
    }

    return red;
  }

  async crear(usuarioAdminId: string, dto: CreateRedSocialDto) {
    await this.validarPlataforma(dto.plataforma_id);

    return this.prisma.redSocial.create({
      data: { usuario_admin_id: usuarioAdminId, ...dto },
      include: INCLUDE_PLATAFORMA,
    });
  }

  async actualizar(id: string, dto: UpdateRedSocialDto) {
    await this.obtener(id);
    if (dto.plataforma_id) {
      await this.validarPlataforma(dto.plataforma_id);
    }

    return this.prisma.redSocial.update({
      where: { id },
      data: { ...dto },
      include: INCLUDE_PLATAFORMA,
    });
  }

  async eliminar(id: string) {
    await this.obtener(id);
    await this.prisma.redSocial.delete({ where: { id } });
  }

  private async validarPlataforma(plataformaId: string) {
    const plataforma = await this.prisma.plataformaRed.findUnique({
      where: { id: plataformaId },
    });
    if (!plataforma) {
      throw new BadRequestException(
        `No existe una plataforma de red con id ${plataformaId}`,
      );
    }
  }
}
