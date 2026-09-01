import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import {
  MEDIA_STORAGE_SERVICE,
  MediaStorageService,
} from './storage/media-storage.interface';

/** Deriva un `tipo` razonable cuando el admin no lo especifica en el DTO. */
function inferirTipo(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'imagen';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'archivo';
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE_SERVICE)
    private readonly storage: MediaStorageService,
  ) {}

  async create(
    file: Express.Multer.File,
    dto: CreateMediaDto,
    usuarioAdminId: string,
  ) {
    const resultado = await this.storage.upload(file);

    return this.prisma.media.create({
      data: {
        usuario_admin_id: usuarioAdminId,
        url: resultado.url,
        s3_key: resultado.key,
        tipo: dto.tipo ?? inferirTipo(file.mimetype),
        ancho: resultado.width,
        alto: resultado.height,
        alt_text: dto.alt_text,
      },
    });
  }
}
