import { IsBoolean, IsIn, IsOptional } from 'class-validator';

/**
 * Campos de personalización compartidos por los 10 tipos de bloque del
 * editor visual (Fase 3.4, UC-07). Cada DTO de `configuracion` por
 * `tipo_seccion` (`hero-configuracion.dto.ts`, etc.) EXTIENDE esta clase
 * (herencia normal de TypeScript) en vez de repetir estos campos (los 5 de Fase 3.4 más `animacion_entrada` y
 * `separador_forma` de la Fase 7, 7.2), así
 * `whitelist`/`forbidNonWhitelisted` (`obtenerErroresConfiguracion`) los
 * sigue aceptando sin declararlos de nuevo en cada subclase.
 *
 * Todos `@IsOptional()` con default de propiedad de clase a propósito, igual
 * criterio que `mostrar_foto_perfil`/`posicion_foto`/`estilo_foto` en
 * `HeroConfiguracionDto` (Sprint 8): hay `Seccion.configuracion` (jsonb) ya
 * persistidas de ANTES de que existieran estos 5 campos. Si fueran
 * requeridos, cualquier `PATCH /admin/secciones/:id/configuracion` sobre una
 * fila vieja (aunque el payload nunca toque estos campos) sería rechazado
 * con 400. `plainToInstance` rellena el default del inicializador de clase
 * cuando la clave no viene en el payload, así un PATCH "viejo" sigue
 * validando en 200.
 */
export class BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsIn(['compacto', 'normal', 'amplio'])
  espaciado_vertical: 'compacto' | 'normal' | 'amplio' = 'normal';

  @IsOptional()
  @IsIn(['estrecho', 'normal', 'amplio', 'completo'])
  ancho_contenido: 'estrecho' | 'normal' | 'amplio' | 'completo' = 'normal';

  @IsOptional()
  @IsIn(['izquierda', 'centro'])
  alineacion_texto: 'izquierda' | 'centro' = 'izquierda';

  @IsOptional()
  @IsIn(['ninguno', 'sutil', 'tarjeta', 'degradado', 'vidrio'])
  fondo_bloque: 'ninguno' | 'sutil' | 'tarjeta' | 'degradado' | 'vidrio' =
    'ninguno';

  @IsOptional()
  @IsBoolean()
  separador_inferior: boolean = true;

  /** Fase 7 (7.2, UC-07): animación de entrada al hacer scroll. */
  @IsOptional()
  @IsIn([
    'ninguna',
    'aparecer',
    'deslizar_arriba',
    'deslizar_lateral',
    'escalar',
  ])
  animacion_entrada:
    | 'ninguna'
    | 'aparecer'
    | 'deslizar_arriba'
    | 'deslizar_lateral'
    | 'escalar' = 'aparecer';

  /** Fase 7 (7.2, UC-07): forma del separador inferior entre bloques. */
  @IsOptional()
  @IsIn(['ninguno', 'onda', 'diagonal', 'curva'])
  separador_forma: 'ninguno' | 'onda' | 'diagonal' | 'curva' = 'ninguno';

  /**
   * Fase 7c (7c.3, UC-07/UC-12): contorno de los contenedores y tarjetas del
   * bloque. El API no impone default: la clave ausente (filas y snapshots
   * anteriores a la fase) se interpreta como 'sutil' (aspecto previo) en el
   * render; el editor, como con los demás campos base, persiste el valor
   * elegido ('sutil' por defecto) en los bloques nuevos.
   */
  @IsOptional()
  @IsIn(['ninguno', 'sutil', 'marcado'])
  borde_bloque?: 'ninguno' | 'sutil' | 'marcado';
}
