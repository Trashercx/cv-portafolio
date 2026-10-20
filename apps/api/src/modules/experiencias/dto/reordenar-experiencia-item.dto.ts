import { IsInt, IsUUID, Min } from 'class-validator';

/** Un elemento del body de `PATCH /admin/experiencias/reordenar` (UC-19). */
export class ReordenarExperienciaItemDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  orden: number;
}
