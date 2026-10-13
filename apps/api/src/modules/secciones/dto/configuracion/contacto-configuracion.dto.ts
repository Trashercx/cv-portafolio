import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'contacto'` (UC-07).
 *
 * `estilo_redes` (Fase 3.4) es propio de este bloque, además de los 5
 * campos base heredados de `BloqueConfiguracionBaseDto`. `@IsOptional()` +
 * default: ninguna fila vieja lo tiene.
 */
export class ContactoConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsBoolean()
  mostrar_formulario: boolean;

  @IsOptional()
  @IsIn(['iconos', 'botones'])
  estilo_redes: 'iconos' | 'botones' = 'iconos';

  // Fase 7 (7.2, UC-07): opcionales.
  @IsOptional()
  @IsIn(['simple', 'tarjeta_destacada'])
  estilo: 'simple' | 'tarjeta_destacada' = 'simple';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  texto_llamada?: string;
}
