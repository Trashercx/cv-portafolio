import { IsBoolean } from 'class-validator';

/** `configuracion` para `tipo_seccion = 'contacto'` (UC-07). */
export class ContactoConfiguracionDto {
  @IsBoolean()
  mostrar_formulario: boolean;
}
