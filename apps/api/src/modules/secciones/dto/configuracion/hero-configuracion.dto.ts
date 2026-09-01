import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * `configuracion` para `tipo_seccion = 'hero'` (UC-07), parámetros exactos
 * según docs/plan-tecnico.md sección 5.
 */
export class HeroConfiguracionDto {
  @IsString()
  titulo: string;

  @IsString()
  subtitulo: string;

  @IsOptional()
  @IsUUID()
  imagen_fondo_media_id?: string;

  @IsOptional()
  @IsString()
  texto_boton?: string;

  @IsOptional()
  @IsString()
  enlace_boton?: string;
}
