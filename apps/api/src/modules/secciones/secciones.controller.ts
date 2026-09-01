import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActualizarVisibilidadSeccionDto } from './dto/actualizar-visibilidad-seccion.dto';
import { CreateSeccionDto } from './dto/create-seccion.dto';
import { ReordenarSeccionItemDto } from './dto/reordenar-seccion-item.dto';
import { UpdateSeccionDto } from './dto/update-seccion.dto';
import { SeccionesService } from './secciones.service';

/**
 * UC-07 (Editar estructura visual, drag-and-drop). Todas las rutas son de
 * administración: no hay vista pública de secciones todavía (eso llega en
 * Sprint 4 vía snapshot de `VersionSitio`, UC-12).
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/secciones')
export class SeccionesController {
  constructor(private readonly seccionesService: SeccionesService) {}

  @Get()
  async listar() {
    return this.seccionesService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.seccionesService.obtener(id);
  }

  @Post()
  async crear(@Req() req: AuthenticatedRequest, @Body() dto: CreateSeccionDto) {
    return this.seccionesService.crear(req.user.sub, dto);
  }

  @Patch('reordenar')
  async reordenar(
    @Body(
      new ParseArrayPipe({
        items: ReordenarSeccionItemDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    items: ReordenarSeccionItemDto[],
  ) {
    await this.seccionesService.reordenar(items);
    return { actualizados: items.length };
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeccionDto,
  ) {
    return this.seccionesService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.seccionesService.eliminar(id);
    return { eliminado: true };
  }

  @Patch(':id/visibilidad')
  async actualizarVisibilidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarVisibilidadSeccionDto,
  ) {
    return this.seccionesService.actualizarVisibilidad(id, dto);
  }

  /**
   * `configuracion` no se tipa como un DTO fijo en la firma: su forma varía
   * según el `tipo_seccion` de la fila (ver `SeccionesService.validarConfiguracion`,
   * que hace la validación real contra el DTO correspondiente).
   */
  @Patch(':id/configuracion')
  async actualizarConfiguracion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() configuracion: Record<string, unknown>,
  ) {
    return this.seccionesService.actualizarConfiguracion(id, configuracion);
  }
}
