import { IsBoolean } from 'class-validator';

/** Body de `PATCH /admin/secciones/:id/visibilidad` (UC-07). */
export class ActualizarVisibilidadSeccionDto {
  @IsBoolean()
  visible: boolean;
}
