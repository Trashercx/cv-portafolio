import { Inject, Injectable, Logger } from '@nestjs/common';
import { sharp } from './sharp';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MEDIA_STORAGE_SERVICE,
  MediaStorageService,
} from './storage/media-storage.interface';

/** Anchos de las variantes responsive (Fase 8, UC-34). */
export const ANCHOS_VARIANTE = [640, 1024, 1600];

/** Solo rasterizadas: nunca svg (vectorial) ni gif (animado). */
export const MIMES_RASTER = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
];

const FORMATOS = ['webp', 'avif'] as const;

/**
 * Genera y borra las variantes webp/avif de una `Media` (Fase 8, UC-34,
 * ext. UC-09 y UC-12). Tolerante por diseño: un error se registra y no se
 * propaga, para que subir o reemplazar una imagen nunca falle por esto.
 */
@Injectable()
export class VariantesImagenService {
  private readonly logger = new Logger(VariantesImagenService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE_SERVICE)
    private readonly storage: MediaStorageService,
  ) {}

  esRasterizable(mimetype: string): boolean {
    return MIMES_RASTER.includes(mimetype);
  }

  /** Devuelve cuántas variantes se crearon (0 si se omitió o falló). */
  async generar(
    mediaId: string,
    buffer: Buffer,
    keyOriginal: string,
    mimetype: string,
  ): Promise<number> {
    if (!this.esRasterizable(mimetype)) return 0;

    try {
      const { width } = await sharp(buffer).metadata();
      if (!width) return 0;

      const anchos =
        width < ANCHOS_VARIANTE[0]
          ? [width]
          : ANCHOS_VARIANTE.filter((a) => a <= width);

      const punto = keyOriginal.lastIndexOf('.');
      const base =
        punto > keyOriginal.lastIndexOf('/')
          ? keyOriginal.slice(0, punto)
          : keyOriginal;

      const filas: {
        media_id: string;
        formato: string;
        ancho: number;
        alto: number;
        url: string;
        s3_key: string;
        bytes: number;
      }[] = [];

      for (const ancho of anchos) {
        for (const formato of FORMATOS) {
          const pipeline = sharp(buffer).rotate().resize({
            width: ancho,
            withoutEnlargement: true,
          });
          const { data, info } = await (
            formato === 'webp'
              ? pipeline.webp({ quality: 80 })
              : pipeline.avif({ quality: 55, effort: 3 })
          ).toBuffer({ resolveWithObject: true });

          const subido = await this.storage.subirDerivado(
            data,
            `${base}-${ancho}.${formato}`,
            `image/${formato}`,
          );
          filas.push({
            media_id: mediaId,
            formato,
            ancho: info.width,
            alto: info.height,
            url: subido.url,
            s3_key: subido.key,
            bytes: info.size,
          });
        }
      }

      await this.prisma.mediaVariante.createMany({ data: filas });
      return filas.length;
    } catch (error) {
      this.logger.error(
        `No se pudieron generar variantes de la media ${mediaId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  /** Borra objetos y filas de las variantes de una media. */
  async eliminarDe(mediaId: string): Promise<void> {
    try {
      const existentes = await this.prisma.mediaVariante.findMany({
        where: { media_id: mediaId },
        select: { s3_key: true },
      });
      await this.storage.eliminar(existentes.map((v) => v.s3_key));
      await this.prisma.mediaVariante.deleteMany({
        where: { media_id: mediaId },
      });
    } catch (error) {
      this.logger.error(
        `No se pudieron borrar variantes de la media ${mediaId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
