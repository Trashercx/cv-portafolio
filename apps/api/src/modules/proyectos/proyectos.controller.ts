import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';

/** UC-03 (Gestionar proyectos) — vista de visitante, siempre pública. */
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Get()
  async listar() {
    return this.proyectosService.listarPublico();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.proyectosService.obtenerPublico(id);
  }
}
