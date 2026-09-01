import { IsOptional, IsString } from 'class-validator';

/**
 * `PATCH /admin/media/:id` (UC-09): edición de metadata de un archivo ya
 * subido. Solo `alt_text` es editable así — `tipo`/`url`/`s3_key`/dimensiones
 * cambian únicamente al reemplazar el archivo (`PATCH /admin/media/:id/reemplazar`).
 */
export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  alt_text?: string;
}
