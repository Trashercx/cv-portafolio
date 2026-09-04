import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Un elemento de `GaleriaConfiguracionDto.fotos` (Fase 4.5, UC-18): una
 * referencia a `Media` (nunca el binario ni la URL directamente, mismo
 * criterio que `HeroConfiguracionDto.imagen_fondo_media_id`) más un título
 * opcional propio de la foto dentro de la galería (distinto de
 * `Media.alt_text`, que describe el archivo en sí).
 */
export class GaleriaFotoDto {
  @IsUUID()
  media_id: string;

  @IsOptional()
  @IsString()
  titulo?: string;
}
