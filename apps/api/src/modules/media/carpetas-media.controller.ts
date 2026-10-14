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
import { CarpetasMediaService } from './carpetas-media.service';
import {
  CreateCarpetaMediaDto,
  MoverMediaDto,
  ReordenarCarpetasDto,
  UpdateCarpetaMediaDto,
} from './dto/carpeta-media.dto';

/**
 * Carpetas de la biblioteca (UC-09 ext., Fase 7e). Se registra ANTES de
 * `MediaController` en el módulo: `carpetas` y `mover` son literales y no
 * deben caer en `admin/media/:id`. Dentro, `reordenar` va antes de `:id`.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/media')
export class CarpetasMediaController {
  constructor(private readonly carpetas: CarpetasMediaService) {}

  @Get('carpetas')
  listar(@Req() req: AuthenticatedRequest) {
    return this.carpetas.listar(req.user.sub);
  }

  @Post('carpetas')
  crear(@Body() dto: CreateCarpetaMediaDto, @Req() req: AuthenticatedRequest) {
    return this.carpetas.crear(req.user.sub, dto);
  }

  @Patch('carpetas/reordenar')
  reordenar(
    @Body() dto: ReordenarCarpetasDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.carpetas.reordenar(req.user.sub, dto.ids);
  }

  @Patch('carpetas/:id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarpetaMediaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.carpetas.actualizar(req.user.sub, id, dto);
  }

  @Delete('carpetas/:id')
  eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.carpetas.eliminar(req.user.sub, id);
  }

  @Post('mover')
  mover(@Body() dto: MoverMediaDto, @Req() req: AuthenticatedRequest) {
    return this.carpetas.mover(req.user.sub, dto);
  }
}
