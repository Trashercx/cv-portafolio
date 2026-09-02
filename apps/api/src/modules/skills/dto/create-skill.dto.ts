import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * UC-16 (Gestionar catálogo de skills) — campos exactos según
 * docs/plan-portafolio.md: nombre, icono, orden, visible.
 *
 * `visible` es opcional aquí: el default (`true`) lo pone el esquema de
 * Prisma (`Skill.visible @default(true)`, ver schema.prisma), mismo criterio
 * de dejarle el default a la columna que ya usa `Seccion.visible` en este
 * proyecto.
 */
export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  icono: string;

  @IsInt()
  orden: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
