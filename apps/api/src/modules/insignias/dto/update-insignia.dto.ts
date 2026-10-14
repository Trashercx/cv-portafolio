import { PartialType } from '@nestjs/mapped-types';
import { CreateInsigniaDto } from './create-insignia.dto';

/** `PATCH /admin/insignias/:id`: todos los campos de creación, opcionales. */
export class UpdateInsigniaDto extends PartialType(CreateInsigniaDto) {}
