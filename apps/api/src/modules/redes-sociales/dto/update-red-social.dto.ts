import { PartialType } from '@nestjs/mapped-types';
import { CreateRedSocialDto } from './create-red-social.dto';

export class UpdateRedSocialDto extends PartialType(CreateRedSocialDto) {}
