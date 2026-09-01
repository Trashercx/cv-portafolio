import { IsInt, IsUUID } from 'class-validator';

/** Un elemento del body de `PATCH /admin/proyectos/:id/imagenes/reordenar`. */
export class ReordenarImagenProyectoItemDto {
  @IsUUID()
  media_id: string;

  @IsInt()
  orden: number;
}
