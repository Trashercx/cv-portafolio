import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'navegacion'` (Fase 7, 7.2, UC-07 y
 * UC-12): la barra de navegación del sitio. No se admite dentro de
 * `columnas` (igual que `hero`, ver `@EsListaDeBloques()`). Los enlaces no se
 * configuran: el frontend los genera con las secciones visibles con título
 * (excepto `hero` y `navegacion`), con ancla `#seccion-{id}`.
 *
 * Todo `@IsOptional()` con default, igual criterio que el resto de bloques.
 */
export class NavegacionConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsIn(['flotante', 'barra'])
  estilo: 'flotante' | 'barra' = 'flotante';

  @IsOptional()
  @IsBoolean()
  fijo: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_nombre: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_cv: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_toggle_modo: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_progreso_scroll: boolean = false;
}
