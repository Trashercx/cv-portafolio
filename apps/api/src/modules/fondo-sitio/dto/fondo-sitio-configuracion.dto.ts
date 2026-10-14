import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * `configuracion` de `FondoSitio` (UC-15), campos según
 * docs/plan-portafolio.md: velocidad, opacidad. `opacidad` se acota a
 * [0, 1] por ser una opacidad estándar de CSS/canvas.
 *
 * Fase 7b (UC-15 ext.): `intensidad` e `interactivo` son opcionales y el API
 * no persiste defaults (el frontend asume `media` y `true` si faltan).
 */
export class FondoSitioConfiguracionDto {
  @IsIn(['lenta', 'media', 'rapida'])
  velocidad: 'lenta' | 'media' | 'rapida';

  @IsNumber()
  @Min(0)
  @Max(1)
  opacidad: number;

  @IsOptional()
  @IsIn(['sutil', 'media', 'alta'])
  intensidad?: 'sutil' | 'media' | 'alta';

  @IsOptional()
  @IsBoolean()
  interactivo?: boolean;
}
