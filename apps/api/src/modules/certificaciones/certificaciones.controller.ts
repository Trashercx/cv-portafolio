import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CertificacionesService } from './certificaciones.service';

/** UC-04 (Gestionar certificaciones) — vista de visitante, siempre pública. */
@Controller('certificaciones')
export class CertificacionesController {
  constructor(
    private readonly certificacionesService: CertificacionesService,
  ) {}

  @Get()
  async listar() {
    return this.certificacionesService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.certificacionesService.obtener(id);
  }
}
