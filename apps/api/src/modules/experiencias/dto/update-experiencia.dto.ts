import { PartialType } from '@nestjs/mapped-types';
import { CreateExperienciaDto } from './create-experiencia.dto';

/** UC-19: todos los campos opcionales (`PATCH /admin/experiencias/:id`). */
export class UpdateExperienciaDto extends PartialType(CreateExperienciaDto) {}
