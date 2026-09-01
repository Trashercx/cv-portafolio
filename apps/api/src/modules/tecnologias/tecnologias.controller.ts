import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTecnologiaDto } from './dto/create-tecnologia.dto';
import { TecnologiasService } from './tecnologias.service';

/** Catálogo de tecnologías, soporte de UC-03 (Gestionar proyectos). */
@UseGuards(JwtAuthGuard)
@Controller('admin/tecnologias')
export class TecnologiasController {
  constructor(private readonly tecnologiasService: TecnologiasService) {}

  @Get()
  async listar() {
    return this.tecnologiasService.listar();
  }

  @Post()
  async crear(@Body() dto: CreateTecnologiaDto) {
    return this.tecnologiasService.crearOReutilizar(dto);
  }
}
