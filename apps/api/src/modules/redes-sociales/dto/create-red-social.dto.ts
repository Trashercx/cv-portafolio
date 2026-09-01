import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * UC-06 (Gestionar enlaces de redes) — campos exactos según
 * docs/plan-portafolio.md: plataforma_id (FK a PlataformaRed), url, orden.
 *
 * `url` se valida como string no vacío (no con `@IsUrl`): la plataforma
 * "Correo" del catálogo semilla usa un enlace `mailto:...`, que el
 * validador estricto de URL de `class-validator` (basado en validator.js,
 * que exige "://") rechaza.
 */
export class CreateRedSocialDto {
  @IsUUID()
  plataforma_id: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsInt()
  orden: number;
}
