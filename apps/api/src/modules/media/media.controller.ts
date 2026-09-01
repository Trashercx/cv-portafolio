import {
  BadRequestException,
  Body,
  Controller,
  Post,
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
import { MediaService } from './media.service';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Módulo `media` mínimo (prerequisito de UC-02/UC-03/UC-04, ver
 * docs/plan-tecnico.md Sprint 1). La biblioteca completa (galería, "usado
 * en", reemplazo seguro) es UC-09, Sprint 3.
 */
@UseGuards(JwtAuthGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
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
}
