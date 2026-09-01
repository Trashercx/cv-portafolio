import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CertificacionesService } from './certificaciones.service';
import { CreateCertificacionDto } from './dto/create-certificacion.dto';
import { UpdateCertificacionDto } from './dto/update-certificacion.dto';

/** UC-04 (Gestionar certificaciones) — administración, CRUD completo. */
@UseGuards(JwtAuthGuard)
@Controller('admin/certificaciones')
export class CertificacionesAdminController {
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

  @Post()
  async crear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCertificacionDto,
  ) {
    return this.certificacionesService.crear(req.user.sub, dto);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCertificacionDto,
  ) {
    return this.certificacionesService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.certificacionesService.eliminar(id);
    return { eliminado: true };
  }
}
