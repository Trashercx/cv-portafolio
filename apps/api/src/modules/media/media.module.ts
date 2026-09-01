import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { LocalMediaStorageService } from './storage/local-media-storage.service';
import { MEDIA_STORAGE_SERVICE } from './storage/media-storage.interface';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    // Implementación real (S3) pendiente de credenciales de AWS — ver el
    // comentario en local-media-storage.service.ts para el reemplazo exacto.
    { provide: MEDIA_STORAGE_SERVICE, useClass: LocalMediaStorageService },
  ],
  exports: [MediaService],
})
export class MediaModule {}
