import { IsOptional, IsString } from 'class-validator';

/**
 * `PATCH /admin/secciones/:id` (UC-07): edición general de una sección.
 *
 * Solo `titulo_visible` es editable por esta vía a propósito: `orden` se
 * cambia con `PATCH /admin/secciones/reordenar`, `visible` con
 * `PATCH /admin/secciones/:id/visibilidad`, y `configuracion` con
 * `PATCH /admin/secciones/:id/configuracion` (donde se valida contra el
 * `tipo_seccion` de la fila). `tipo_seccion` no es editable tras la
 * creación: cambiarlo invalidaría la forma de `configuracion` ya guardada;
 * si el bloque debe ser de otro tipo, se recrea la sección.
 */
export class UpdateSeccionDto {
  @IsOptional()
  @IsString()
  titulo_visible?: string;
}
