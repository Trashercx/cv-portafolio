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
import { CreateRedSocialDto } from './dto/create-red-social.dto';
import { UpdateRedSocialDto } from './dto/update-red-social.dto';
import { RedesSocialesService } from './redes-sociales.service';

/** UC-06 (Gestionar enlaces de redes) — administración, CRUD completo. */
@UseGuards(JwtAuthGuard)
@Controller('admin/redes-sociales')
export class RedesSocialesAdminController {
  constructor(private readonly redesSocialesService: RedesSocialesService) {}

  @Get()
  async listar() {
    return this.redesSocialesService.listar();
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.redesSocialesService.obtener(id);
  }

  @Post()
  async crear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateRedSocialDto,
  ) {
    return this.redesSocialesService.crear(req.user.sub, dto);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRedSocialDto,
  ) {
    return this.redesSocialesService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.redesSocialesService.eliminar(id);
    return { eliminado: true };
  }
}
