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
import { CreateTemaDto } from './dto/create-tema.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { TemaService } from './tema.service';

/** UC-08 (Personalizar tema visual) — administración, siempre detrás de JwtAuthGuard. */
@UseGuards(JwtAuthGuard)
@Controller('admin/temas')
export class TemaController {
  constructor(private readonly temaService: TemaService) {}

  @Get()
  async listar() {
    return this.temaService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.temaService.obtener(id);
  }

  @Post()
  async crear(@Req() req: AuthenticatedRequest, @Body() dto: CreateTemaDto) {
    return this.temaService.crear(req.user.sub, dto);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemaDto,
  ) {
    return this.temaService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.temaService.eliminar(id);
    return { eliminado: true };
  }

  @Patch(':id/activar')
  async activar(@Param('id', ParseUUIDPipe) id: string) {
    return this.temaService.activar(id);
  }
}
