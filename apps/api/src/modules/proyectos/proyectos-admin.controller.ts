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
import { AsociarImagenProyectoDto } from './dto/asociar-imagen-proyecto.dto';
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { ReordenarImagenProyectoItemDto } from './dto/reordenar-imagen-proyecto-item.dto';
import { ReordenarProyectoItemDto } from './dto/reordenar-proyecto-item.dto';
import { UpdateProyectoDto } from './dto/update-proyecto.dto';
import { ProyectosService } from './proyectos.service';

/** UC-03 (Gestionar proyectos) — administración, siempre detrás de JwtAuthGuard. */
@UseGuards(JwtAuthGuard)
@Controller('admin/proyectos')
export class ProyectosAdminController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Get()
  async listar() {
    return this.proyectosService.listarAdmin();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.proyectosService.obtenerAdmin(id);
  }

  @Post()
  async crear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProyectoDto,
  ) {
    return this.proyectosService.crear(req.user.sub, dto);
  }

  @Patch('reordenar')
  async reordenar(
    @Body(
      new ParseArrayPipe({
        items: ReordenarProyectoItemDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    items: ReordenarProyectoItemDto[],
  ) {
    await this.proyectosService.reordenar(items);
    return { actualizados: items.length };
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProyectoDto,
  ) {
    return this.proyectosService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.proyectosService.eliminar(id);
    return { eliminado: true };
  }

  @Post(':id/tecnologias/:tecnologiaId')
  async agregarTecnologia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tecnologiaId', ParseUUIDPipe) tecnologiaId: string,
  ) {
    return this.proyectosService.agregarTecnologia(id, tecnologiaId);
  }

  @Delete(':id/tecnologias/:tecnologiaId')
  async quitarTecnologia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tecnologiaId', ParseUUIDPipe) tecnologiaId: string,
  ) {
    await this.proyectosService.quitarTecnologia(id, tecnologiaId);
    return { eliminado: true };
  }

  @Post(':id/imagenes')
  async agregarImagen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsociarImagenProyectoDto,
  ) {
    return this.proyectosService.agregarImagen(id, dto);
  }

  @Patch(':id/imagenes/reordenar')
  async reordenarImagenes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(
      new ParseArrayPipe({
        items: ReordenarImagenProyectoItemDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    items: ReordenarImagenProyectoItemDto[],
  ) {
    await this.proyectosService.reordenarImagenes(id, items);
    return { actualizados: items.length };
  }

  @Delete(':id/imagenes/:mediaId')
  async quitarImagen(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    await this.proyectosService.quitarImagen(id, mediaId);
    return { eliminado: true };
  }
}
