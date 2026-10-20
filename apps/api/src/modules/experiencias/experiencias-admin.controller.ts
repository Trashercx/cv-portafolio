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
import { CreateExperienciaDto } from './dto/create-experiencia.dto';
import { ReordenarExperienciaItemDto } from './dto/reordenar-experiencia-item.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';
import { ExperienciasService } from './experiencias.service';

/** UC-19 (Gestionar experiencia laboral, Fase 7l) — siempre con JwtAuthGuard. */
@UseGuards(JwtAuthGuard)
@Controller('admin/experiencias')
export class ExperienciasAdminController {
  constructor(private readonly experienciasService: ExperienciasService) {}

  @Get()
  async listar() {
    return this.experienciasService.listar();
  }

  @Post()
  async crear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateExperienciaDto,
  ) {
    return this.experienciasService.crear(req.user.sub, dto);
  }

  // Antes de `:id` para que "reordenar" no se interprete como un id.
  @Patch('reordenar')
  async reordenar(
    @Body(
      new ParseArrayPipe({
        items: ReordenarExperienciaItemDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    items: ReordenarExperienciaItemDto[],
  ) {
    await this.experienciasService.reordenar(items);
    return { actualizados: items.length };
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.experienciasService.obtener(id);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExperienciaDto,
  ) {
    return this.experienciasService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.experienciasService.eliminar(id);
    return { eliminado: true };
  }
}
