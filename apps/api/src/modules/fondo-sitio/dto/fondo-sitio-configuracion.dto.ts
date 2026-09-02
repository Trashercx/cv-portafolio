import { IsIn, IsNumber, Max, Min } from 'class-validator';

/**
 * `configuracion` de `FondoSitio` (UC-15), campos exactos según
 * docs/plan-portafolio.md: velocidad, opacidad. `opacidad` se acota a
 * [0, 1] por ser una opacidad estándar de CSS/canvas.
 */
export class FondoSitioConfiguracionDto {
  @IsIn(['lenta', 'media', 'rapida'])
  velocidad: 'lenta' | 'media' | 'rapida';

  @IsNumber()
  @Min(0)
  @Max(1)
  opacidad: number;
}
