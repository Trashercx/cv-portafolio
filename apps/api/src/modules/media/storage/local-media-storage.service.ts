import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { dirname, extname, join } from 'path';
import {
  MediaStorageService,
  UploadedMediaResult,
} from './media-storage.interface';

/**
 * STUB LOCAL — ya no es la implementación por defecto desde Sprint 3.
 *
 * Reemplazada como provider real por `S3MediaStorageService` (UC-09, ver ese
 * archivo) en `media.module.ts`, ahora que existen credenciales de AWS.
 * Esta clase se conserva por dos motivos:
 *
 * 1. Referencia de cómo se veía la implementación mínima de Sprint 1.
 * 2. Fake/stub inyectado en los tests (unitarios y e2e) vía
 *    `overrideProvider(MEDIA_STORAGE_SERVICE)` para que ninguna prueba le
 *    pegue a S3 real ni dependa de red/credenciales (ver
 *    `test/media.e2e-spec.ts` y `media.service.spec.ts`).
 *
 * Si se usa fuera de tests (p. ej. desarrollo local sin credenciales), sigue
 * guardando el archivo en disco (`apps/api/uploads/`, gitignorado) y sirve
 * una URL local (`main.ts` expone `/uploads` como carpeta estática).
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

  /** Fase 8 (UC-34): escribe el derivado en `uploads/<key>`. */
  async subirDerivado(
    buffer: Buffer,
    key: string,
  ): Promise<{ url: string; key: string }> {
    const destino = join(this.uploadsDir, key);
    await fs.mkdir(dirname(destino), { recursive: true });
    await fs.writeFile(destino, buffer);
    const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return { url: `${baseUrl}/uploads/${key}`, key };
  }

  async descargar(key: string): Promise<Buffer> {
    return fs.readFile(join(this.uploadsDir, key));
  }

  async eliminar(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((key) =>
        fs.unlink(join(this.uploadsDir, key)).catch(() => undefined),
      ),
    );
  }
}
