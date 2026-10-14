import { Module } from '@nestjs/common';
import { VersionesSitioModule } from '../versiones-sitio/versiones-sitio.module';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

/** Fase 8, UC-34: metadatos SEO en servidor, sitemap y robots (rutas públicas). */
@Module({
  imports: [VersionesSitioModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
