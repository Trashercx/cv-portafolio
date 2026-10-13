import { IsIn, IsOptional, IsString } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'logros'` (UC-07).
 *
 * `estilo_lista` (Fase 3.4) es propio de este bloque, además de los 5
 * campos base heredados de `BloqueConfiguracionBaseDto`. `@IsOptional()` +
 * default: ninguna fila vieja lo tiene.
 */
export class LogrosConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsString()
  categoria_filtro?: string;

  @IsOptional()
  @IsIn(['tarjetas', 'linea_tiempo'])
  estilo_lista: 'tarjetas' | 'linea_tiempo' = 'tarjetas';

  // Fase 7 (7.2, UC-07).
  @IsOptional()
  @IsIn(['ninguno', 'elevar', 'inclinar'])
  efecto_hover: 'ninguno' | 'elevar' | 'inclinar' = 'elevar';
}
