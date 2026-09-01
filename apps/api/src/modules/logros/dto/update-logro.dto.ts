import { PartialType } from '@nestjs/mapped-types';
import { CreateLogroDto } from './create-logro.dto';

export class UpdateLogroDto extends PartialType(CreateLogroDto) {}
