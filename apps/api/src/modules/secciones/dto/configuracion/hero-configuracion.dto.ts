import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'hero'` (UC-07), parámetros exactos
 * según docs/plan-tecnico.md sección 5.
 *
 * `mostrar_foto_perfil`/`posicion_foto`/`estilo_foto` (Sprint 8) son
 * `@IsOptional()` con default de propiedad de clase a propósito: hay
 * secciones `hero` ya persistidas en `Seccion.configuracion` (jsonb) de
 * ANTES de que existieran estos 3 campos, sin backfill de datos. Si fueran
 * requeridos, cualquier `PATCH /admin/secciones/:id/configuracion` sobre una
 * de esas filas viejas (p. ej. solo para cambiar el título) sería rechazado
 * con 400 por `forbidNonWhitelisted`/validación estricta en
 * `SeccionesService.validarConfiguracion`, aunque el payload nunca tocó esos
 * campos. `plainToInstance` (usado ahí, no el `ValidationPipe` global)
 * aplica el default del inicializador de clase vía `new HeroConfiguracionDto()`
 * cuando la clave no viene en el payload, así que un PATCH "viejo" sin estos
 * 3 campos sigue validando en 200. El `ValidationPipe` global (`main.ts`)
 * también tiene `transform: true`, por si algún día `configuracion` se tipa
 * como DTO anidado directo en el controller.
 *
 * `altura`/`overlay_fondo`/`tamano_titulo` (Fase 3.4) son propios de este
 * bloque, además de los 5 campos base heredados de
 * `BloqueConfiguracionBaseDto`. Mismo criterio de `@IsOptional()` + default:
 * ninguna fila vieja los tiene.
 */
export class HeroConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsString()
  titulo: string;

  @IsString()
  subtitulo: string;

  @IsOptional()
  @IsUUID()
  imagen_fondo_media_id?: string;

  @IsOptional()
  @IsString()
  texto_boton?: string;

  @IsOptional()
  @IsString()
  enlace_boton?: string;

  @IsOptional()
  @IsBoolean()
  mostrar_foto_perfil: boolean = false;

  @IsOptional()
  @IsIn(['ninguna', 'centrada', 'esquina_superior', 'esquina_inferior'])
  posicion_foto:
    'ninguna' | 'centrada' | 'esquina_superior' | 'esquina_inferior' =
    'ninguna';

  @IsOptional()
  @IsIn(['con_marco', 'sin_fondo'])
  estilo_foto: 'con_marco' | 'sin_fondo' = 'con_marco';

  @IsOptional()
  @IsIn(['normal', 'grande', 'pantalla_completa'])
  altura: 'normal' | 'grande' | 'pantalla_completa' = 'normal';

  @IsOptional()
  @IsIn(['ninguno', 'oscuro', 'claro'])
  overlay_fondo: 'ninguno' | 'oscuro' | 'claro' = 'ninguno';

  @IsOptional()
  @IsIn(['normal', 'grande'])
  tamano_titulo: 'normal' | 'grande' = 'normal';
}
