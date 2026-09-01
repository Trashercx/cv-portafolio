import { IsOptional, IsString } from 'class-validator';

/** Query params de `GET /admin/media` (UC-09): filtro opcional por `tipo`. */
export class ListarMediaQueryDto {
  @IsOptional()
  @IsString()
  tipo?: string;
}
