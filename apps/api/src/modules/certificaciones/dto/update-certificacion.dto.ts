import { PartialType } from '@nestjs/mapped-types';
import { CreateCertificacionDto } from './create-certificacion.dto';

export class UpdateCertificacionDto extends PartialType(
  CreateCertificacionDto,
) {}
