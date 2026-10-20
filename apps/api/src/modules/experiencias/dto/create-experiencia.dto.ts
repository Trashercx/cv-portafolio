import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EsFechaIso } from '../../../common/validators/es-fecha-iso.decorator';
import { EsPosteriorA } from '../../../common/validators/es-posterior-a.decorator';

export const MODALIDADES_EXPERIENCIA = [
  'presencial',
  'remoto',
  'hibrido',
] as const;
export type ModalidadExperiencia = (typeof MODALIDADES_EXPERIENCIA)[number];

/**
 * UC-19 (experiencia laboral, Fase 7l) — campos según docs/plan-portafolio.md:
 * empresa, cargo, descripcion, fecha_inicio, fecha_fin (nula = puesto
 * actual), ubicacion, modalidad, url_empresa, logo (biblioteca),
 * tecnologias (catálogo por nombre), visible. `orden` lo asigna el servicio
 * al crear (al final) y se cambia con `PATCH reordenar`.
 */
export class CreateExperienciaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  empresa: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  cargo: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  /** Un puesto no empieza en el futuro. */
  @EsFechaIso({ noFutura: true })
  fecha_inicio: string;

  /** `null` o ausente = puesto actual. Puede coincidir con `fecha_inicio`. */
  @IsOptional()
  @EsFechaIso()
  @EsPosteriorA('fecha_inicio', { oIgual: true })
  fecha_fin?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacion?: string | null;

  @IsIn(MODALIDADES_EXPERIENCIA)
  modalidad: ModalidadExperiencia;

  @IsOptional()
  @MaxLength(2000)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url_empresa?: string | null;

  @IsOptional()
  @IsUUID()
  logo_media_id?: string | null;

  /** Nombres del catálogo `Tecnologia` (upsert por nombre exacto). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(60, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.trim() : v))
      : value,
  )
  tecnologias?: string[];

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
