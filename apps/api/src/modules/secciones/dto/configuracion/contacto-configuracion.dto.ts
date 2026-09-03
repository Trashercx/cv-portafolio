import { IsBoolean, IsIn, IsOptional } from 'class-validator';
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
}
