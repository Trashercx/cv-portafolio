import { IsOptional, IsString } from 'class-validator';

/**
 * Metadata que acompaña al archivo en `POST /admin/media` (el archivo en sí
 * viaja en el campo multipart `file`, no en este DTO). `tipo` es opcional:
 * si no se manda, `MediaService` lo infiere del `mimetype` del archivo.
 */
export class CreateMediaDto {
  @IsOptional()
  @IsString()
  alt_text?: string;

  @IsOptional()
  @IsString()
  tipo?: string;
}
