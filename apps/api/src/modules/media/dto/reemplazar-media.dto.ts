import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { CARPETAS_MEDIA } from './create-media.dto';

/**
 * `PATCH /admin/media/:id/reemplazar` (UC-09): el archivo viaja en el campo
 * multipart `file`. `carpeta` es opcional, igual que en `CreateMediaDto`.
 * `alt_text`/`tipo` no se aceptan aquí a propósito: `tipo` se recalcula del
 * `mimetype` del nuevo archivo y `alt_text` se edita por separado con
 * `PATCH /admin/media/:id`.
 */
export class ReemplazarMediaDto {
  @IsOptional()
  @IsIn(CARPETAS_MEDIA)
  carpeta?: (typeof CARPETAS_MEDIA)[number];

  /** Fase 7e (UC-09): mueve el archivo a esta carpeta de la biblioteca. */
  @IsOptional()
  @IsUUID('4')
  carpeta_id?: string;
}
