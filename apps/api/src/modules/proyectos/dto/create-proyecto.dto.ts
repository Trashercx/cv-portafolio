import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

/**
 * UC-03 (Gestionar proyectos) — campos exactos según
 * docs/plan-portafolio.md: titulo, descripcion, url_demo (opcional),
 * url_repositorio (opcional), fecha_inicio, fecha_fin (opcional), estado,
 * destacado, orden. Tecnologías e imágenes se gestionan con sus propios
 * endpoints (relaciones N:M / tabla de unión), no como parte de este DTO.
 */
export class CreateProyectoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url_demo?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url_repositorio?: string;

  @IsDateString()
  fecha_inicio: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  @IsBoolean()
  destacado: boolean;

  @IsInt()
  orden: number;
}
