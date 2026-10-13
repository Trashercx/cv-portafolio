// `@Type()` (class-transformer) lee metadata de diseño vía
// `Reflect.getMetadata` en el momento en que se aplica el decorador (al
// definir la clase), no de forma perezosa. Este DTO se importa desde
// `./index.ts` (un hub compartido por casi todo el módulo `secciones`,
// incluido `@EsListaDeBloques()`), así que cualquier test que solo
// necesitaba `class-validator` (sin `@Type()`) hasta ahora puede llegar
// aquí de forma transitiva sin haber cargado el polyfill todavía. Mismo
// criterio que `create-fondo-sitio.dto.spec.ts` (el otro DTO del proyecto
// con `@Type()`), pero aplicado aquí en vez de en cada spec consumidor: el
// árbol de importadores de este archivo es demasiado amplio (cualquier DTO
// de bloque, por `EsListaDeBloques`) para mantenerlo a mano en cada uno.
import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';
import { GaleriaFotoDto } from './galeria-foto.dto';

/**
 * `configuracion` para `tipo_seccion = 'galeria'` (Fase 4.5, UC-18): un
 * bloque del editor visual que muestra una colección de fotos, en carousel o
 * grid. Decisión de arquitectura (docs/plan-portafolio.md §4): reusa
 * `Seccion.configuracion` (jsonb), el mismo patrón que `columnas` (Fase
 * 3.3/UC-17) — NO se usa el patrón `ProyectoImagen` (relación N:N con tabla
 * propia) porque las fotos de una galería son una forma variable propia de
 * un bloque del editor, sin sentido fuera de él. Sin migración de tabla.
 *
 * `fotos` referencia `Media` por id (`GaleriaFotoDto.media_id`), nunca el
 * binario/URL directamente — mismo criterio que
 * `HeroConfiguracionDto.imagen_fondo_media_id`. El snapshot público
 * (`VersionesSitioService`) resuelve cada `media_id` a la `Media` completa,
 * igual que hace hoy con `hero.imagen_fondo`.
 *
 * Todos los campos son `@IsOptional()` con default de propiedad de clase,
 * regla de oro del proyecto desde el commit `0cd07c7` (`docs/plan-tecnico.md`
 * sección 5): nunca campos requeridos nuevos, para que un
 * `PATCH /admin/secciones/:id/configuracion` sobre una fila ya persistida
 * nunca se rompa. `fotos` vacío (`[]`) es un estado válido: una galería
 * recién agregada al lienzo, sin fotos todavía.
 */
export class GaleriaConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GaleriaFotoDto)
  fotos: GaleriaFotoDto[] = [];

  @IsOptional()
  @IsIn(['carousel', 'grid'])
  disposicion: 'carousel' | 'grid' = 'carousel';

  @IsOptional()
  @IsIn([2, 3, 4])
  columnas_grid: 2 | 3 | 4 = 3;

  // Fase 7 (7.2, UC-18).
  @IsOptional()
  @IsIn(['ninguno', 'zoom', 'elevar'])
  efecto_hover: 'ninguno' | 'zoom' | 'elevar' = 'zoom';
}
