import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInsigniaDto } from './dto/create-insignia.dto';
import { ImportarInsigniaDto } from './dto/importar-insignia.dto';
import { ReordenarInsigniasDto } from './dto/reordenar-insignias.dto';
import { UpdateInsigniaDto } from './dto/update-insignia.dto';
import { InsigniasService } from './insignias.service';

const FILE_INTERCEPTOR_OPTIONS = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
};

/**
 * UC-35 (Insignias importables, Fase 7d) — administración, siempre detrás de
 * JwtAuthGuard. Las rutas literales (`reordenar`, `importar`,
 * `importar-archivo`) van ANTES de las rutas con `:id`.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/insignias')
export class InsigniasAdminController {
  constructor(private readonly insigniasService: InsigniasService) {}

  @Get()
  async listar() {
    return this.insigniasService.listar();
  }

  @Post()
  async crear(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInsigniaDto,
  ) {
    return this.insigniasService.crear(req.user.sub, dto);
  }

  @Patch('reordenar')
  async reordenar(@Body() dto: ReordenarInsigniasDto) {
    await this.insigniasService.reordenar(dto.ids);
    return { actualizados: dto.ids.length };
  }

  /**
   * Hace peticiones salientes con lo que escribe el administrador: límite
   * estricto por IP (10/min; `THROTTLE_IMPORTAR_LIMIT` lo ajusta en pruebas).
   */
  @Throttle({
    default: {
      limit: () => Number(process.env.THROTTLE_IMPORTAR_LIMIT ?? 10),
      ttl: 60_000,
    },
  })
  @Post('importar')
  async importar(@Body() dto: ImportarInsigniaDto) {
    return this.insigniasService.importar(dto.entrada);
  }

  @Throttle({
    default: {
      limit: () => Number(process.env.THROTTLE_IMPORTAR_LIMIT ?? 10),
      ttl: 60_000,
    },
  })
  @Post('importar-archivo')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  async importarArchivo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (campo "file")');
    }
    return this.insigniasService.importarArchivo(file, req.user.sub);
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.insigniasService.obtener(id);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInsigniaDto,
  ) {
    return this.insigniasService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.insigniasService.eliminar(id);
    return { eliminado: true };
  }
}
