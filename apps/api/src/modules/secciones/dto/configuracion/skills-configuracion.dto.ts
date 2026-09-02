import { IsIn } from 'class-validator';

/** `configuracion` para `tipo_seccion = 'skills'` (UC-07 + UC-16). */
export class SkillsConfiguracionDto {
  @IsIn(['izquierda', 'derecha'])
  direccion: 'izquierda' | 'derecha';

  @IsIn(['lenta', 'media', 'rapida'])
  velocidad: 'lenta' | 'media' | 'rapida';
}
