import { Module } from '@nestjs/common';
import { CarpetasMediaController } from './carpetas-media.controller';
import { CarpetasMediaService } from './carpetas-media.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaUsosService } from './media-usos.service';
import { VariantesImagenService } from './variantes-imagen.service';
import { MEDIA_STORAGE_SERVICE } from './storage/media-storage.interface';
import { S3MediaStorageService } from './storage/s3-media-storage.service';

@Module({
  // Fase 7e: CarpetasMediaController va primero (rutas literales antes de `:id`).
  controllers: [CarpetasMediaController, MediaController],
  providers: [
    MediaService,
    CarpetasMediaService,
    MediaUsosService,
    VariantesImagenService,
    // Implementación real (UC-09, Sprint 3): sube a Amazon S3. Ver
    // `LocalMediaStorageService` para el stub de referencia usado en tests
    // (se inyecta ahí vía overrideProvider, no aquí).
    { provide: MEDIA_STORAGE_SERVICE, useClass: S3MediaStorageService },
  ],
  exports: [MediaService, MediaUsosService],
})
export class MediaModule {}
