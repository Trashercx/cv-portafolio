import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ORDENES_MEDIA = ['reciente', 'antiguo', 'nombre'] as const;

/**
 * Query params de `GET /admin/media` (UC-09): filtro por `tipo`, búsqueda `q`
 * (alt_text y nombre de archivo) y `orden` (Fase 7d).
 */
export class ListarMediaQueryDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(ORDENES_MEDIA)
  orden?: (typeof ORDENES_MEDIA)[number];
}
