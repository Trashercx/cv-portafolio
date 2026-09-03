import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'sobre-mi'` (UC-07). El contenido en
 * sí sale de `Perfil`, no se duplica aquí.
 *
 * `posicion_foto`/`forma_foto` (Fase 3.4) son propios de este bloque, además
 * de los 5 campos base heredados de `BloqueConfiguracionBaseDto`.
 * `@IsOptional()` + default: ninguna fila vieja los tiene.
 *
 * OJO: `posicion_foto` aquí es un campo DISTINTO del `posicion_foto` de
 * `HeroConfiguracionDto` (valores `'ninguna'|'centrada'|'esquina_superior'|
 * 'esquina_inferior'`, DTO distinto) — mismo nombre, catálogo de valores
 * propio de este bloque.
 */
export class SobreMiConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsBoolean()
  mostrar_foto: boolean;

  @IsOptional()
  @IsIn(['izquierda', 'derecha'])
  posicion_foto: 'izquierda' | 'derecha' = 'izquierda';

  @IsOptional()
  @IsIn(['circular', 'cuadrada'])
  forma_foto: 'circular' | 'cuadrada' = 'circular';
}
