import { IsIn, IsOptional, IsString } from 'class-validator';

/** Prefijos de carpeta válidos del bucket S3 (docs/plan-tecnico.md sección 5). */
export const CARPETAS_MEDIA = [
  'perfil',
  'proyectos',
  'certificaciones',
  'logros',
] as const;

/**
 * Metadata que acompaña al archivo en `POST /admin/media` (el archivo en sí
 * viaja en el campo multipart `file`, no en este DTO). `tipo` es opcional:
 * si no se manda, `MediaService` lo infiere del `mimetype` del archivo.
 * `carpeta` es opcional: indica en qué prefijo del bucket S3 se guarda el
 * archivo cuando el cliente ya sabe para qué entidad lo está subiendo; si no
 * se indica, `S3MediaStorageService` usa un prefijo genérico.
 */
export class CreateMediaDto {
  @IsOptional()
  @IsString()
  alt_text?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsIn(CARPETAS_MEDIA)
  carpeta?: (typeof CARPETAS_MEDIA)[number];
}
