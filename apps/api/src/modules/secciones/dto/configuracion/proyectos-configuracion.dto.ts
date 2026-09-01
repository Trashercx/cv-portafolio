import { IsBoolean, IsInt, IsPositive } from 'class-validator';

/** `configuracion` para `tipo_seccion = 'proyectos'` (UC-07). */
export class ProyectosConfiguracionDto {
  @IsInt()
  @IsPositive()
  cantidad_a_mostrar: number;

  @IsBoolean()
  solo_destacados: boolean;
}
