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
import { CreateFondoSitioDto } from './dto/create-fondo-sitio.dto';
import { UpdateFondoSitioDto } from './dto/update-fondo-sitio.dto';
import { FondoSitioService } from './fondo-sitio.service';

/** UC-15 (Configurar fondo animado del sitio) — administración, siempre detrás de JwtAuthGuard. */
@UseGuards(JwtAuthGuard)
@Controller('admin/fondos')
export class FondoSitioController {
  constructor(private readonly fondoSitioService: FondoSitioService) {}

  @Get()
  async listar() {
    return this.fondoSitioService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.fondoSitioService.obtener(id);
  }

  @Post()
  async crear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFondoSitioDto,
  ) {
    return this.fondoSitioService.crear(req.user.sub, dto);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFondoSitioDto,
  ) {
    return this.fondoSitioService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.fondoSitioService.eliminar(id);
    return { eliminado: true };
  }

  @Patch(':id/activar')
  async activar(@Param('id', ParseUUIDPipe) id: string) {
    return this.fondoSitioService.activar(id);
  }
}
