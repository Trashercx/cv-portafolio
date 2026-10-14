import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

/** Prefijos de carpeta válidos del bucket S3 (docs/plan-tecnico.md sección 5). */
export const CARPETAS_MEDIA = [
  'perfil',
  'proyectos',
  'certificaciones',
  'logros',
  'insignias',
] as const;

/**
 * Metadata que acompaña al archivo en `POST /admin/media` (el archivo en sí
 * viaja en el campo multipart `file`, no en este DTO). `tipo` es opcional:
 * si no se manda, `MediaService` lo infiere del MIME REAL (por contenido, no
 * el declarado); si es `imagen` o `pdf` se contrasta con el contenido y un
 * desajuste es 400 (Undécima ronda, UC-09).
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

  /** Fase 7e (UC-09): carpeta de la biblioteca donde se crea el archivo. */
  @IsOptional()
  @IsUUID('4')
  carpeta_id?: string;
}
