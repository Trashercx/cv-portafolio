import { PartialType } from '@nestjs/mapped-types';
import { CreateProyectoDto } from './create-proyecto.dto';

/** `PATCH /admin/proyectos/:id`: todos los campos de creación, opcionales. */
export class UpdateProyectoDto extends PartialType(CreateProyectoDto) {}
