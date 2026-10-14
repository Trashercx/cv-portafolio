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
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthenticatedRequest } from '../../common/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMediaDto } from './dto/create-media.dto';
import { ListarMediaQueryDto } from './dto/listar-media-query.dto';
import { ReemplazarMediaDto } from './dto/reemplazar-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { MediaService } from './media.service';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const FILE_INTERCEPTOR_OPTIONS = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
};

/**
 * Biblioteca multimedia (UC-09): subida, listado con filtro por tipo,
 * edición de metadata, borrado con verificación de "usado en" y reemplazo
 * seguro (misma fila `Media`, sin romper referencias existentes).
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  async subir(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (campo "file")');
    }

    return this.mediaService.create(file, dto, req.user.sub);
  }

  /**
   * Fase 8 (UC-34): ruta literal declarada ANTES de las rutas con `:id`.
   */
  @Post('variantes/regenerar')
  async regenerarFaltantes() {
    return this.mediaService.regenerarFaltantes();
  }

  @Post(':id/variantes')
  async regenerarVariantes(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.regenerarVariantes(id);
  }

  @Get()
  async listar(@Query() query: ListarMediaQueryDto) {
    return this.mediaService.listar(query);
  }

  @Get(':id')
  async obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.obtener(id);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.mediaService.actualizar(id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseUUIDPipe) id: string) {
    await this.mediaService.eliminar(id);
    return { eliminado: true };
  }

  @Patch(':id/reemplazar')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  async reemplazar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReemplazarMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (campo "file")');
    }

    return this.mediaService.reemplazar(id, file, dto.carpeta);
  }
}
