import { IsInt, IsUUID } from 'class-validator';

/** Un elemento del body de `PATCH /admin/secciones/reordenar` (array de estos). */
export class ReordenarSeccionItemDto {
  @IsUUID()
  id: string;

  @IsInt()
  orden: number;
}
