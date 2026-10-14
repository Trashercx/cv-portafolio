import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { EsFechaIso } from '../../../common/validators/es-fecha-iso.decorator';
import { EsPosteriorA } from '../../../common/validators/es-posterior-a.decorator';

/**
 * UC-04 (Gestionar certificaciones) — campos exactos según
 * docs/plan-portafolio.md: nombre, institucion, fecha_emision,
 * fecha_expiracion (opcional), url_verificacion, credencial_id (opcional),
 * logo_media_id (opcional, FK a Media), orden.
 */
export class CreateCertificacionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  institucion: string;

  /** Una certificación no se emite en el futuro. */
  @EsFechaIso({ noFutura: true })
  fecha_emision: string;

  /**
   * Sin `noFutura`: una fecha de expiración casi siempre es futura.
   * Debe ser estrictamente posterior a `fecha_emision` (no puede expirar
   * el mismo día que se emite).
   */
  @IsOptional() // null = "No expira" (Fase 7e): IsOptional omite el resto de validadores
  @EsFechaIso()
  @EsPosteriorA('fecha_emision')
  fecha_expiracion?: string | null;

  @IsUrl({ require_tld: false })
  url_verificacion: string;

  @IsOptional()
  @IsString()
  credencial_id?: string;

  @IsOptional()
  @IsUUID()
  logo_media_id?: string;

  @IsInt()
  orden: number;
}
