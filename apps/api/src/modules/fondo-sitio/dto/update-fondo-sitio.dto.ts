import { PartialType } from '@nestjs/mapped-types';
import { CreateFondoSitioDto } from './create-fondo-sitio.dto';

/** `PATCH /admin/fondos/:id`: todos los campos de creación, opcionales. `activo` sigue sin ser editable aquí (ver CreateFondoSitioDto). */
export class UpdateFondoSitioDto extends PartialType(CreateFondoSitioDto) {}
