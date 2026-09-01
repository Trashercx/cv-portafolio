import { IsInt, IsUUID } from 'class-validator';

/** Un elemento del body de `PATCH /admin/proyectos/reordenar` (array de estos). */
export class ReordenarProyectoItemDto {
  @IsUUID()
  id: string;

  @IsInt()
  orden: number;
}
