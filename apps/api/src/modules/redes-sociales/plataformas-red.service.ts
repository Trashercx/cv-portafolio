import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Catálogo de plataformas de red social, sembrado por `prisma/seed.ts`
 * (LinkedIn, GitHub, Twitter/X, Correo, Sitio personal). De solo lectura
 * por ahora: no hay `POST` porque el catálogo se administra vía seed.
 */
@Injectable()
export class PlataformasRedService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.plataformaRed.findMany({ orderBy: { nombre: 'asc' } });
  }
}
