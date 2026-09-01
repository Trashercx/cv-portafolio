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
import { CreateLogroDto } from './dto/create-logro.dto';
import { UpdateLogroDto } from './dto/update-logro.dto';
import { LogrosService } from './logros.service';

/** UC-05 (Gestionar logros y reconocimientos) — administración, CRUD completo. */
@UseGuards(JwtAuthGuard)
@Controller('admin/logros')
export class LogrosAdminController {
  constructor(private readonly logrosService: LogrosService) {}

  @Get()
  async listar() {
    return this.logrosService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.logrosService.obtener(id);
  }

  @Post()
  async crear(@Req() req: AuthenticatedRequest, @Body() dto: CreateLogroDto) {
    return this.logrosService.crear(req.user.sub, dto);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLogroDto,
  ) {
    return this.logrosService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.logrosService.eliminar(id);
    return { eliminado: true };
  }
}
