import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'insignias'` (Fase 7d, UC-35 + UC-07).
 *
 * Campos base + presentación de la rejilla. Todos opcionales con default:
 * el API no persiste defaults (el render tolera claves ausentes). Las
 * insignias en sí no se referencian aquí: vienen de `snapshot.insignias`
 * (solo las `visible`, ordenadas), así que no hay ids de media que resolver.
 * Permitido dentro de `columnas` (`@EsListaDeBloques` solo excluye `hero`,
 * `navegacion` y `columnas`).
 */
export class InsigniasConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitulo?: string;

  @IsOptional()
  @IsIn([2, 3, 4, 'auto'])
  columnas: 2 | 3 | 4 | 'auto' = 'auto';

  @IsOptional()
  @IsIn(['compacto', 'normal', 'grande'])
  tamano: 'compacto' | 'normal' | 'grande' = 'normal';

  @IsOptional()
  @IsIn(['inclinar_brillo', 'girar', 'elevar', 'ninguno'])
  efecto_hover: 'inclinar_brillo' | 'girar' | 'elevar' | 'ninguno' =
    'inclinar_brillo';

  @IsOptional()
  @IsBoolean()
  mostrar_emisor: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_fecha: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_habilidades: boolean = false;

  @IsOptional()
  @IsBoolean()
  mostrar_enlace: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limite?: number;
}
