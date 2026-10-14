import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** `POST /admin/media/carpetas` (UC-09, Fase 7e): nombre de 1 a 60, recortado. */
export class CreateCarpetaMediaDto {
  @Transform(recortar)
  @IsString()
  @Length(1, 60)
  nombre!: string;
}

/** `PATCH /admin/media/carpetas/:id` (UC-09, Fase 7e). */
export class UpdateCarpetaMediaDto {
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @Length(1, 60)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

/** `PATCH /admin/media/carpetas/reordenar` (UC-09, Fase 7e). */
export class ReordenarCarpetasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids!: string[];
}

/** `POST /admin/media/mover` (UC-09, Fase 7e): `carpeta_id` null = "Sin carpeta". */
export class MoverMediaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ValidateIf((o: MoverMediaDto) => o.carpeta_id !== null)
  @IsUUID('4')
  carpeta_id!: string | null;
}
