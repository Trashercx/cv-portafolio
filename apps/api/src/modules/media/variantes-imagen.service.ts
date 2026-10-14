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

export interface ResultadoGeneracion {
  generadas: number;
  omitida: boolean;
  error?: string;
}

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

  /**
   * Devuelve cuántas variantes se crearon, si se omitió (no rasterizable) o el
   * error ocurrido. Nunca lanza; ante un fallo a mitad de camino borra los
   * objetos ya subidos para no dejar huérfanos (Fase 8, UC-34).
   */
  async generar(
    mediaId: string,
    buffer: Buffer,
    keyOriginal: string,
    mimetype: string,
  ): Promise<ResultadoGeneracion> {
    if (!this.esRasterizable(mimetype)) return { generadas: 0, omitida: true };

    const subidas: string[] = [];
    try {
      const { width } = await sharp(buffer).metadata();
      if (!width) return { generadas: 0, omitida: true };

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
          subidas.push(subido.key);
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
      return { generadas: filas.length, omitida: false };
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudieron generar variantes de la media ${mediaId}: ${motivo}`,
      );
      if (subidas.length > 0) {
        try {
          await this.storage.eliminar(subidas);
        } catch (limpieza) {
          this.logger.error(
            `No se pudieron limpiar ${subidas.length} variantes huérfanas de la media ${mediaId}: ${
              limpieza instanceof Error ? limpieza.message : String(limpieza)
            }`,
          );
        }
      }
      return { generadas: 0, omitida: false, error: motivo };
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
