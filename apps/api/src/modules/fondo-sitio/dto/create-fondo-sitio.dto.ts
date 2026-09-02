import { Type } from 'class-transformer';
import { IsIn, ValidateNested } from 'class-validator';
import { FondoSitioConfiguracionDto } from './fondo-sitio-configuracion.dto';

/**
 * UC-15 (Configurar fondo animado del sitio) — campos exactos según
 * docs/plan-portafolio.md: tipo, configuracion (velocidad, opacidad), activo.
 *
 * `activo` NO forma parte de este DTO a propósito: un fondo siempre se crea
 * inactivo (`activo: false` por default en el esquema); la única forma de
 * activarlo es `PATCH /admin/fondos/:id/activar`, que aplica la regla de
 * negocio de exclusividad (un solo fondo activo por administrador) dentro de
 * una transacción. Aceptar `activo` aquí permitiría saltarse esa regla.
 * Mismo criterio que `CreateTemaDto`, ver su comentario.
 */
export class CreateFondoSitioDto {
  @IsIn([
    'solido',
    'degradado_animado',
    'aurora_animada',
    'particulas',
    'cuadricula_animada',
  ])
  tipo:
    | 'solido'
    | 'degradado_animado'
    | 'aurora_animada'
    | 'particulas'
    | 'cuadricula_animada';

  @ValidateNested()
  @Type(() => FondoSitioConfiguracionDto)
  configuracion: FondoSitioConfiguracionDto;
}
