import { Controller, Get, Header, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SeoService } from './seo.service';

/**
 * Fase 8, UC-34: metadatos en servidor, sitemap y robots. Rutas públicas
 * (sin guard). `@SkipThrottle()`: las peticiones llegan desde la IP interna
 * de nginx (subrequest SSI) y el límite global por IP las bloquearía.
 */
@SkipThrottle()
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /** Fragmento HTML de `<head>` para la ruta indicada en `X-Ruta-Publica`. */
  @Get('seo/metadatos')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-cache')
  async metadatos(@Headers('x-ruta-publica') ruta?: string) {
    return this.seoService.generarFragmento(ruta);
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap() {
    return this.seoService.generarSitemap();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots() {
    return this.seoService.generarRobots();
  }
}
