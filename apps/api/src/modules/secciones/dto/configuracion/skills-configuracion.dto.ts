import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'skills'` (UC-07 + UC-16).
 *
 * `tamano_icono`/`mostrar_nombres`/`pausar_al_pasar` (Fase 3.4) son propios
 * de este bloque, además de los 5 campos base heredados de
 * `BloqueConfiguracionBaseDto`. `@IsOptional()` + default: ninguna fila
 * vieja los tiene.
 *
 * OJO con el default de `tamano_icono`: es `'lg'`, no `'md'` — el carrusel
 * público ya usa `tamano="lg"` hardcodeado desde la Fase 3.2, así que `'lg'`
 * es el que reproduce el aspecto actual sin cambios al desplegar.
 */
export class SkillsConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsIn(['izquierda', 'derecha'])
  direccion: 'izquierda' | 'derecha';

  @IsIn(['lenta', 'media', 'rapida'])
  velocidad: 'lenta' | 'media' | 'rapida';

  @IsOptional()
  @IsIn(['sm', 'md', 'lg'])
  tamano_icono: 'sm' | 'md' | 'lg' = 'lg';

  @IsOptional()
  @IsBoolean()
  mostrar_nombres: boolean = true;

  @IsOptional()
  @IsBoolean()
  pausar_al_pasar: boolean = true;

  // Fase 7 (7.2, UC-07/UC-16): opcionales con default.
  @IsOptional()
  @IsIn(['marquesina', 'cuadricula', 'nube'])
  disposicion: 'marquesina' | 'cuadricula' | 'nube' = 'marquesina';

  @IsOptional()
  @IsIn(['simple', 'vidrio', 'contorno'])
  estilo_chip: 'simple' | 'vidrio' | 'contorno' = 'simple';
}
