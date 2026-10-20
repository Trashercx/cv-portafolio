import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BloqueConfiguracionBaseDto } from './bloque-configuracion-base.dto';

/**
 * `configuracion` para `tipo_seccion = 'insignias'` (Fase 7d, UC-35 + UC-07).
 *
 * Campos base + presentación de la rejilla. Todos opcionales con default:
 * el API no persiste defaults (el render tolera claves ausentes). Las
 * insignias en sí no se referencian aquí: vienen de `snapshot.insignias`
 * (solo las `visible`, ordenadas), así que no hay ids de media que resolver.
 * Permitido dentro de `columnas` (`@EsListaDeBloques` solo excluye `hero`,
 * `navegacion` y `columnas`).
 */
export class InsigniasConfiguracionDto extends BloqueConfiguracionBaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitulo?: string;

  @IsOptional()
  @IsIn([2, 3, 4, 'auto'])
  columnas: 2 | 3 | 4 | 'auto' = 'auto';

  @IsOptional()
  @IsIn(['compacto', 'normal', 'grande'])
  tamano: 'compacto' | 'normal' | 'grande' = 'normal';

  @IsOptional()
  @IsIn(['inclinar_brillo', 'girar', 'elevar', 'ninguno'])
  efecto_hover: 'inclinar_brillo' | 'girar' | 'elevar' | 'ninguno' =
    'inclinar_brillo';

  /**
   * Fase 7h (UC-35): `medalla` muestra solo la insignia (sin tarjeta ni
   * texto largo), con animación en reposo y toda la medalla como enlace a la
   * verificación; `tarjeta` es la presentación de la Fase 7d.
   */
  @IsOptional()
  @IsIn(['medalla', 'tarjeta'])
  estilo: 'medalla' | 'tarjeta' = 'medalla';

  /** Fase 7h: movimiento continuo de las medallas (apagado con movimiento reducido). */
  @IsOptional()
  @IsIn(['flotar', 'balanceo', 'destello', 'ninguna'])
  animacion_reposo: 'flotar' | 'balanceo' | 'destello' | 'ninguna' = 'flotar';

  /** Fase 7h: decoración detrás/debajo de cada medalla. */
  @IsOptional()
  @IsIn(['halo', 'aro', 'cinta', 'ninguno'])
  marco_medalla: 'halo' | 'aro' | 'cinta' | 'ninguno' = 'halo';

  /** Fase 7h: cuándo se ve el nombre bajo la medalla. */
  @IsOptional()
  @IsIn(['al_pasar', 'siempre', 'nunca'])
  etiqueta_medalla: 'al_pasar' | 'siempre' | 'nunca' = 'al_pasar';

  @IsOptional()
  @IsBoolean()
  mostrar_emisor: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_fecha: boolean = true;

  @IsOptional()
  @IsBoolean()
  mostrar_habilidades: boolean = false;

  @IsOptional()
  @IsBoolean()
  mostrar_enlace: boolean = true;

  /**
   * Fase 7l (UC-36/UC-07): `rejilla` (actual), `carrusel` (scroll-snap con
   * flechas y puntos) o `cinta` (marquee continuo).
   */
  @IsOptional()
  @IsIn(['rejilla', 'carrusel', 'cinta'])
  disposicion: 'rejilla' | 'carrusel' | 'cinta' = 'rejilla';

  /** Fase 7l: avance automático del carrusel (se pausa al pasar/enfocar). */
  @IsOptional()
  @IsBoolean()
  reproduccion_automatica?: boolean;

  /** Fase 7l: segundos entre avances del carrusel. */
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(15)
  intervalo_segundos?: number;

  /** Fase 7l: velocidad de la cinta. */
  @IsOptional()
  @IsIn(['lenta', 'normal', 'rapida'])
  velocidad_cinta?: 'lenta' | 'normal' | 'rapida';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limite?: number;
}
