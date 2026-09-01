import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TIPOS_SECCION, TipoSeccion } from './configuracion';

/**
 * UC-07 (Editar estructura visual). `configuracion` llega como objeto plano
 * y se valida contra el DTO específico de `tipo_seccion` en
 * `SeccionesService.validarConfiguracion` (no como JSON libre) — ver
 * `dto/configuracion/index.ts`.
 */
export class CreateSeccionDto {
  @IsIn(TIPOS_SECCION)
  tipo_seccion: TipoSeccion;

  @IsString()
  titulo_visible: string;

  @IsInt()
  orden: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsObject()
  configuracion: Record<string, unknown>;
}
