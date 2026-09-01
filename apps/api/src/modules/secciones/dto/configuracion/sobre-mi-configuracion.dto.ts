import { IsBoolean } from 'class-validator';

/**
 * `configuracion` para `tipo_seccion = 'sobre-mi'` (UC-07). El contenido en
 * sí sale de `Perfil`, no se duplica aquí; único parámetro propio del bloque.
 */
export class SobreMiConfiguracionDto {
  @IsBoolean()
  mostrar_foto: boolean;
}
