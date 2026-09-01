import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import sharp from 'sharp';
import {
  MediaStorageService,
  UploadedMediaResult,
} from './media-storage.interface';

/**
 * Estructura de carpetas del bucket (docs/plan-tecnico.md sección 5):
 * `perfil/`, `proyectos/`, `certificaciones/`, `logros/`. `POST /admin/media`
 * sube el archivo a la biblioteca antes de saber si terminará usado en
 * perfil/proyecto/certificación (la asociación es posterior, vía
 * `media_id`), así que se acepta un `carpeta` opcional como parámetro
 * (ver `CreateMediaDto.carpeta`) y se cae a un prefijo genérico
 * (`biblioteca/`) cuando no se indica una de las cuatro carpetas válidas.
 */
const CARPETAS_VALIDAS = new Set([
  'perfil',
  'proyectos',
  'certificaciones',
  'logros',
]);
const CARPETA_GENERICA = 'biblioteca';

/**
 * Implementación real de `MediaStorageService` (UC-09, Sprint 3) sobre
 * Amazon S3, usando el SDK oficial (`@aws-sdk/client-s3`) para subir el
 * buffer directo al bucket, sin pasar por disco local, y `sharp` para leer
 * `width`/`height` cuando el archivo es una imagen (no genera miniaturas
 * todavía; eso queda como mejora futura opcional según el criterio de
 * `docs/plan-tecnico.md` Sprint 3).
 */
@Injectable()
export class S3MediaStorageService implements MediaStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontDomain?: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'us-east-1';
    this.bucket = process.env.S3_BUCKET_NAME ?? '';
    this.cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || undefined;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async upload(
    file: Express.Multer.File,
    carpeta?: string,
  ): Promise<UploadedMediaResult> {
    const carpetaFinal =
      carpeta && CARPETAS_VALIDAS.has(carpeta) ? carpeta : CARPETA_GENERICA;
    const extension = extname(file.originalname);
    const key = `${carpetaFinal}/${randomUUID()}${extension}`;

    const { width, height } = await this.leerDimensiones(file);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { url: this.construirUrl(key), key, width, height };
  }

  /** No bloquea la subida si el archivo no es imagen o sharp no logra leer su metadata. */
  private async leerDimensiones(
    file: Express.Multer.File,
  ): Promise<{ width?: number; height?: number }> {
    if (!file.mimetype.startsWith('image/')) {
      return {};
    }

    try {
      const metadata = await sharp(file.buffer).metadata();
      return { width: metadata.width, height: metadata.height };
    } catch {
      return {};
    }
  }

  private construirUrl(key: string): string {
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
