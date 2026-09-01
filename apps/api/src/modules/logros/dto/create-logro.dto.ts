import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

/**
 * UC-05 (Gestionar logros y reconocimientos) — campos exactos según
 * docs/plan-portafolio.md: titulo, descripcion, fecha, categoria,
 * url_referencia (opcional), orden.
 */
export class CreateLogroDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url_referencia?: string;

  @IsInt()
  orden: number;
}
