import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { EsFechaIso } from '../../../common/validators/es-fecha-iso.decorator';
import { EsPosteriorA } from '../../../common/validators/es-posterior-a.decorator';

/**
 * UC-03 (Gestionar proyectos) — campos exactos según
 * docs/plan-portafolio.md: titulo, descripcion, url_demo (opcional),
 * url_repositorio (opcional), fecha_inicio, fecha_fin (opcional), estado,
 * destacado, orden. Tecnologías e imágenes se gestionan con sus propios
 * endpoints (relaciones N:M / tabla de unión), no como parte de este DTO.
 */
export class CreateProyectoDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url_demo?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url_repositorio?: string;

  /** Un proyecto no empieza en el futuro. */
  @EsFechaIso({ noFutura: true })
  fecha_inicio: string;

  /**
   * Sin `noFutura`: un proyecto puede seguir "en curso" y su fecha de fin
   * planeada ser futura. Puede coincidir con `fecha_inicio` (proyecto de un
   * solo día), de ahí `oIgual: true`.
   */
  @IsOptional()
  @EsFechaIso()
  @EsPosteriorA('fecha_inicio', { oIgual: true })
  fecha_fin?: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  @IsBoolean()
  destacado: boolean;

  @IsInt()
  orden: number;
}
