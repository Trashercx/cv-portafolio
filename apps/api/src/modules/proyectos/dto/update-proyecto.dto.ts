import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProyectoDto } from './create-proyecto.dto';

/**
 * `PATCH /admin/proyectos/:id`: todos los campos de creación, opcionales.
 *
 * Fase 7l (UC-36): además `sincronizar_github`, el único campo de GitHub que
 * edita el administrador (apagarlo congela un proyecto importado). `origen` y
 * `github_*` los fija solo la sincronización: la whitelist los rechaza.
 */
export class UpdateProyectoDto extends PartialType(CreateProyectoDto) {
  @IsOptional()
  @IsBoolean()
  sincronizar_github?: boolean;
}
