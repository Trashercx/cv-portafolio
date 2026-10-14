import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

/**
 * `PATCH /admin/insignias/reordenar` (UC-35): ids en el orden deseado; la
 * posición pasa a ser `orden` (0, 1, 2, ...), en una sola transacción.
 */
export class ReordenarInsigniasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
