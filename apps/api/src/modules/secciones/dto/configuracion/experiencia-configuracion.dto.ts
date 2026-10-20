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
 * `configuracion` para `tipo_seccion = 'experiencia'` (Fase 7l, UC-19 +
 * UC-07). Las experiencias en sí no se referencian aquí: vienen de
 * `snapshot.experiencias` (solo las visibles, ya ordenadas), así que no hay
 * ids de media que resolver. Todos los campos son opcionales con default de
 * clase (el API no persiste defaults; el render tolera claves ausentes).
 * Permitido dentro de `columnas` (`@EsListaDeBloques` solo excluye
 * `columnas` y `navegacion`).
 */
export class ExperienciaConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitulo?: string;

  @IsOptional()
  @IsIn(['linea_tiempo', 'tarjetas', 'compacta'])
  disposicion: 'linea_tiempo' | 'tarjetas' | 'compacta' = 'linea_tiempo';

  @IsOptional()
  @IsBoolean()
  mostrar_duracion: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_tecnologias: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_logos: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_ubicacion: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limite?: number;

  @IsOptional()
  @IsIn(['ninguno', 'elevar', 'inclinar'])
  efecto_hover: 'ninguno' | 'elevar' | 'inclinar' = 'elevar';
}
