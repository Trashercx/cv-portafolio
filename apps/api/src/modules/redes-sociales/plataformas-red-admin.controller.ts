import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlataformasRedService } from './plataformas-red.service';

/** Catálogo de plataformas de red social, soporte de UC-06 (solo lectura). */
@UseGuards(JwtAuthGuard)
@Controller('admin/plataformas-red')
export class PlataformasRedAdminController {
  constructor(private readonly plataformasRedService: PlataformasRedService) {}

  @Get()
  async listar() {
    return this.plataformasRedService.listar();
  }
}
