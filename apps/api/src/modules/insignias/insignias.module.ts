import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { InsigniasAdminController } from './insignias-admin.controller';
import { InsigniasService } from './insignias.service';

/**
 * UC-35 (Fase 7d). Sin controlador público: las insignias visibles viajan en
 * el snapshot (`VersionesSitioService.armarSnapshot`) y el visitante las lee
 * en `GET /sitio`.
 */
@Module({
  imports: [MediaModule],
  controllers: [InsigniasAdminController],
  providers: [InsigniasService],
  exports: [InsigniasService],
})
export class InsigniasModule {}
