import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** `POST /admin/media/eliminar-lote` (UC-09, Fase 7d): 1 a 100 ids. */
export class EliminarLoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}
