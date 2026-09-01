import { IsIn } from 'class-validator';

/** `configuracion` para `tipo_seccion = 'certificaciones'` (UC-07). */
export class CertificacionesConfiguracionDto {
  @IsIn(['fecha', 'manual'])
  orden: 'fecha' | 'manual';
}
