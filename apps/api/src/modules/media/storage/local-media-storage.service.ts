import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import {
  MediaStorageService,
  UploadedMediaResult,
} from './media-storage.interface';

/**
 * STUB TEMPORAL — Sprint 1 (docs/plan-tecnico.md).
 *
 * `docs/plan-portafolio.md` y `CLAUDE.md` piden `@aws-sdk/client-s3` +
 * multer-s3 (+ sharp para miniaturas/dimensiones) para subir archivos.
 * Todavía no existen credenciales de AWS configuradas (`AWS_ACCESS_KEY_ID`,
 * `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` en `.env.example`
 * están vacías), y bloquear el Sprint 1 completo por eso no vale la pena:
 * ningún caso de uso de este sprint depende de que el archivo esté
 * realmente en S3, solo de que `Media` tenga una URL y una key coherentes.
 *
 * Por eso esta implementación guarda el archivo en disco local
 * (`apps/api/uploads/`, listada en `.gitignore`, nunca se commitea) y arma
 * una URL servida por el propio Nest (`main.ts` expone `/uploads` como
 * carpeta estática). El contrato (`MediaStorageService.upload`) es
 * exactamente el mismo que tendrá la implementación real, así que
 * reemplazarla no requiere tocar `MediaService` ni los controladores.
 *
 * QUÉ REEMPLAZAR CUANDO HAYA CREDENCIALES DE AWS REALES:
 * 1. Crear `S3MediaStorageService implements MediaStorageService` en este
 *    mismo directorio, usando `@aws-sdk/client-s3` (`PutObjectCommand`)
 *    para subir el buffer al bucket (`S3_BUCKET_NAME`), con key
 *    `{carpeta}/{uuid}.{extension}` según la convención de
 *    `docs/plan-tecnico.md` sección 5 (`perfil/`, `proyectos/`,
 *    `certificaciones/`, `logros/`, `backups/`).
 * 2. Usar `sharp` sobre el buffer para leer `width`/`height` reales cuando
 *    el archivo es una imagen (esta implementación local los deja
 *    `undefined` porque no procesa el archivo).
 * 3. Devolver `url` como la URL pública de S3 (o de CloudFront si
 *    `CLOUDFRONT_DOMAIN` está configurado) y `key` como el `s3_key` usado.
 * 4. Cambiar el `provide: MEDIA_STORAGE_SERVICE` en `media.module.ts` de
 *    `LocalMediaStorageService` a `S3MediaStorageService`. Nada más cambia.
 * 5. Borrar este archivo y la carpeta `uploads/` (y el `express.static` de
 *    `main.ts`) una vez que S3 sea la única implementación en uso.
 */
@Injectable()
export class LocalMediaStorageService implements MediaStorageService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  async upload(file: Express.Multer.File): Promise<UploadedMediaResult> {
    await fs.mkdir(this.uploadsDir, { recursive: true });

    const extension = extname(file.originalname);
    const key = `${randomUUID()}${extension}`;
    await fs.writeFile(join(this.uploadsDir, key), file.buffer);

    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';

    return {
      url: `${baseUrl}/uploads/${key}`,
      key,
      // width/height: no calculados aquí a propósito, ver nota de arriba (sharp).
    };
  }
}
