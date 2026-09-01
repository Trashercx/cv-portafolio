import { IsOptional, IsString } from 'class-validator';

/** `configuracion` para `tipo_seccion = 'logros'` (UC-07). */
export class LogrosConfiguracionDto {
  @IsOptional()
  @IsString()
  categoria_filtro?: string;
}
