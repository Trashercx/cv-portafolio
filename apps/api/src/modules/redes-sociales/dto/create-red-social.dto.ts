import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Coincide con un esquema URI genérico al inicio del valor (`http:`,
 * `https:`, `mailto:`, o cualquier esquema futuro) — RFC 3986 §3.1.
 */
const ESQUEMA_URI = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

/**
 * UC-06 (Gestionar enlaces de redes) — campos exactos según
 * docs/plan-portafolio.md: plataforma_id (FK a PlataformaRed), url, orden.
 *
 * `url` se valida como string no vacío (no con `@IsUrl`): la plataforma
 * "Correo" del catálogo semilla usa un enlace `mailto:...`, que el
 * validador estricto de URL de `class-validator` (basado en validator.js,
 * que exige "://") rechaza.
 *
 * Además se normaliza con `@Transform`: si el valor no trae ya un esquema
 * reconocible (`http:`, `https:`, `mailto:`, etc.), se le antepone
 * `https://`. Defensa en profundidad — el formulario del frontend
 * (`redSocialSchema`) ya hace la misma normalización, pero cualquier otro
 * cliente de la API queda cubierto igual. Sin esto, un `url` como
 * `linkedin.com/in/usuario` termina como `<a href>` relativo al propio
 * origen en vez de un enlace externo real.
 */
export class CreateRedSocialDto {
  @IsUUID()
  plataforma_id: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' && value.length > 0 && !ESQUEMA_URI.test(value)
      ? `https://${value}`
      : value,
  )
  url: string;

  @IsInt()
  orden: number;
}
