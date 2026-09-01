import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * UC-08 (Personalizar tema visual) — campos exactos según
 * docs/plan-portafolio.md: nombre, color_primario/secundario/fondo/texto,
 * fuente_principal, modo (claro/oscuro).
 *
 * `activo` NO forma parte de este DTO a propósito: un tema siempre se crea
 * inactivo (`activo: false` por default en el esquema); la única forma de
 * activarlo es `PATCH /admin/temas/:id/activar`, que aplica la regla de
 * negocio de exclusividad (un solo tema activo por administrador) dentro de
 * una transacción. Aceptar `activo` aquí permitiría saltarse esa regla.
 */
export class CreateTemaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  color_primario: string;

  @IsString()
  @IsNotEmpty()
  color_secundario: string;

  @IsString()
  @IsNotEmpty()
  color_fondo: string;

  @IsString()
  @IsNotEmpty()
  color_texto: string;

  @IsString()
  @IsNotEmpty()
  fuente_principal: string;

  @IsIn(['claro', 'oscuro'])
  modo: 'claro' | 'oscuro';
}
