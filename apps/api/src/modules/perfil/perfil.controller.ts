import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertPerfilDto } from './dto/upsert-perfil.dto';
import { PerfilService } from './perfil.service';

/**
 * UC-02 (Gestionar perfil personal). Sin endpoint público todavía: el
 * sitio público lee el snapshot publicado (UC-12, Sprint 4), no esta tabla
 * directamente.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/perfil')
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  async obtener(@Req() req: AuthenticatedRequest) {
    return this.perfilService.obtener(req.user.sub);
  }

  @Put()
  async actualizar(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpsertPerfilDto,
  ) {
    return this.perfilService.upsert(req.user.sub, dto);
  }
}
