import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'proyectos'` (UC-07).
 *
 * `columnas`/`estilo_tarjeta`/`mostrar_descripcion` (Fase 3.4) son propios
 * de este bloque, además de los 5 campos base heredados de
 * `BloqueConfiguracionBaseDto`. `@IsOptional()` + default: ninguna fila
 * vieja los tiene.
 */
export class ProyectosConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsInt()
  @IsPositive()
  cantidad_a_mostrar: number;

  @IsBoolean()
  solo_destacados: boolean;

  @IsOptional()
  @IsIn([2, 3])
  columnas: 2 | 3 = 3;

  @IsOptional()
  @IsIn(['simple', 'con_sombra', 'vidrio'])
  estilo_tarjeta: 'simple' | 'con_sombra' | 'vidrio' = 'simple';

  @IsOptional()
  @IsBoolean()
  mostrar_descripcion: boolean = true;

  // Fase 7 (7.2, UC-07): opcionales con default.
  @IsOptional()
  @IsIn(['tarjetas', 'bento', 'lista'])
  disposicion: 'tarjetas' | 'bento' | 'lista' = 'tarjetas';

  @IsOptional()
  @IsIn(['ninguno', 'elevar', 'inclinar'])
  efecto_hover: 'ninguno' | 'elevar' | 'inclinar' = 'elevar';

  @IsOptional()
  @IsBoolean()
  mostrar_tecnologias: boolean = true;
}
