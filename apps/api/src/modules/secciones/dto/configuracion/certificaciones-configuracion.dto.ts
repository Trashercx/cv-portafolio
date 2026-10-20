import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'certificaciones'` (UC-07).
 *
 * `columnas`/`estilo_tarjeta`/`mostrar_fecha` (Fase 3.4) son propios de este
 * bloque, además de los 5 campos base heredados de
 * `BloqueConfiguracionBaseDto`. `@IsOptional()` + default: ninguna fila
 * vieja los tiene.
 */
export class CertificacionesConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsIn(['fecha', 'manual'])
  orden: 'fecha' | 'manual';

  @IsOptional()
  @IsIn([2, 3])
  columnas: 2 | 3 = 3;

  @IsOptional()
  @IsIn(['simple', 'con_sombra', 'vidrio'])
  estilo_tarjeta: 'simple' | 'con_sombra' | 'vidrio' = 'simple';

  @IsOptional()
  @IsBoolean()
  mostrar_fecha: boolean = true;

  // Fase 7 (7.2, UC-07).
  @IsOptional()
  @IsIn(['ninguno', 'elevar', 'inclinar'])
  efecto_hover: 'ninguno' | 'elevar' | 'inclinar' = 'elevar';

  // Fase 7l (UC-04, UC-07): presentación y datos visibles.
  @IsOptional()
  @IsIn(['tarjetas', 'linea_tiempo', 'logos'])
  disposicion: 'tarjetas' | 'linea_tiempo' | 'logos' = 'tarjetas';

  @IsOptional()
  @IsBoolean()
  mostrar_emisor?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrar_vigencia?: boolean;

  @IsOptional()
  @IsBoolean()
  mostrar_enlace?: boolean;
}
