import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VersionesSitioService } from './versiones-sitio.service';

/**
 * UC-10 (Previsualizar cambios) y UC-11 (Publicar o revertir una versión) —
 * administración, siempre detrás de `JwtAuthGuard`. El sitio público
 * (UC-12 a UC-14) vive en `PublicoModule`, sin este guard.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/versiones')
export class VersionesSitioAdminController {
  constructor(private readonly versionesSitioService: VersionesSitioService) {}

  @Get()
  async listar() {
    return this.versionesSitioService.listar();
  }

  @Post('preview')
  async preview(@Req() req: AuthenticatedRequest) {
    return this.versionesSitioService.preview(req.user.sub);
  }

  @Post('publicar')
  async publicar(@Req() req: AuthenticatedRequest) {
    return this.versionesSitioService.publicar(req.user.sub);
  }

  @Post(':id/revertir')
  async revertir(@Param('id', ParseUUIDPipe) id: string) {
    return this.versionesSitioService.revertir(id);
  }
}
