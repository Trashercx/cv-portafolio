import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NoJuntoCon } from './no-junto-con.decorator';

export const PROVEEDORES_INSIGNIA = [
  'credly',
  'open_badges',
  'generico',
  'manual',
] as const;

/**
 * `POST /admin/insignias` (UC-35, Fase 7d): campos de la entidad salvo
 * id/orden/timestamps. La imagen llega como `imagen_media_id` (ya en la
 * biblioteca) **o** como `imagen_url_remota` (https; el servidor la descarga
 * con `descargarRecursoSeguro` y la guarda en la carpeta `insignias`), nunca
 * ambas ni ninguna. `fecha_*` son `YYYY-MM-DD`.
 */
export class CreateInsigniaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  emisor: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @IsIn(PROVEEDORES_INSIGNIA)
  proveedor?: (typeof PROVEEDORES_INSIGNIA)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  id_externo?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  url_verificacion?: string;

  /** Enlace o código de embed con el que se importó (hasta 4000, como la entrada). */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  url_origen?: string;

  @ValidateIf(
    (o: CreateInsigniaDto) =>
      o.imagen_media_id !== undefined || o.imagen_url_remota === undefined,
  )
  @IsUUID()
  @NoJuntoCon('imagen_url_remota')
  imagen_media_id?: string;

  @ValidateIf(
    (o: CreateInsigniaDto) =>
      o.imagen_url_remota !== undefined || o.imagen_media_id === undefined,
  )
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  imagen_url_remota?: string;

  @IsOptional()
  @IsDateString()
  fecha_emision?: string;

  @IsOptional()
  @IsDateString()
  fecha_expiracion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.trim() : v))
      : value,
  )
  habilidades?: string[];

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
