import { PartialType } from '@nestjs/mapped-types';
import { CreateTemaDto } from './create-tema.dto';

/** `PATCH /admin/temas/:id`: todos los campos de creación, opcionales. `activo` sigue sin ser editable aquí (ver CreateTemaDto). */
export class UpdateTemaDto extends PartialType(CreateTemaDto) {}
