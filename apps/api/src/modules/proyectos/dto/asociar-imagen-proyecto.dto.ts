import { IsInt, IsUUID } from 'class-validator';

/** Body de `POST /admin/proyectos/:id/imagenes`: asocia un Media ya existente. */
export class AsociarImagenProyectoDto {
  @IsUUID()
  media_id: string;

  @IsInt()
  orden: number;
}
