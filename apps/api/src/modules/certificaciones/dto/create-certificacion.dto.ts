import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

/**
 * UC-04 (Gestionar certificaciones) — campos exactos según
 * docs/plan-portafolio.md: nombre, institucion, fecha_emision,
 * fecha_expiracion (opcional), url_verificacion, credencial_id (opcional),
 * logo_media_id (opcional, FK a Media), orden.
 */
export class CreateCertificacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  institucion: string;

  @IsDateString()
  fecha_emision: string;

  @IsOptional()
  @IsDateString()
  fecha_expiracion?: string;

  @IsUrl({ require_tld: false })
  url_verificacion: string;

  @IsOptional()
  @IsString()
  credencial_id?: string;

  @IsOptional()
  @IsUUID()
  logo_media_id?: string;

  @IsInt()
  orden: number;
}
