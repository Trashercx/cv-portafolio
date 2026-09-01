import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MEDIA_STORAGE_SERVICE } from './storage/media-storage.interface';
import { S3MediaStorageService } from './storage/s3-media-storage.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    // Implementación real (UC-09, Sprint 3): sube a Amazon S3. Ver
    // `LocalMediaStorageService` para el stub de referencia usado en tests
    // (se inyecta ahí vía overrideProvider, no aquí).
    { provide: MEDIA_STORAGE_SERVICE, useClass: S3MediaStorageService },
  ],
  exports: [MediaService],
})
export class MediaModule {}
