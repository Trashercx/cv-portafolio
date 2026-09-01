import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTecnologiaDto } from './dto/create-tecnologia.dto';

@Injectable()
export class TecnologiasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.tecnologia.findMany({ orderBy: { nombre: 'asc' } });
  }

  /**
   * Crea la tecnología si no existe (por `nombre`); si ya existe, la
   * reutiliza sin duplicar el catálogo (regla explícita del alcance de
   * UC-03: "no dupliques el catálogo").
   */
  async crearOReutilizar(dto: CreateTecnologiaDto) {
    return this.prisma.tecnologia.upsert({
      where: { nombre: dto.nombre },
      update: {},
      create: { nombre: dto.nombre },
    });
  }
}
