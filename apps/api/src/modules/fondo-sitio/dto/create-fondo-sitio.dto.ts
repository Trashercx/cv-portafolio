import { Type } from 'class-transformer';
import { IsIn, ValidateNested } from 'class-validator';
import { FondoSitioConfiguracionDto } from './fondo-sitio-configuracion.dto';

/**
 * Catálogo de fondos (Fase 7b, UC-15 ext.). Única lista en el API; replica
 * las claves de `apps/web/src/features/fondo-sitio/catalogo-fondos.ts`.
 * Reemplaza a los 8 tipos anteriores (migración de datos
 * `fondo_sitio_tipos_fase_7b`; mapa de reemplazo en docs/plan-tecnico.md,
 * "Fase 7b"). Los tipos antiguos ya no se aceptan (400).
 */
export const TIPOS_FONDO = [
  'solido',
  'aurora_mesh',
  'malla_puntos',
  'rejilla_perspectiva',
  'particulas_red',
  'ondas_fluidas',
  'haces_luz',
  'degradado_grano',
  'campo_estrellas',
] as const;

export type TipoFondo = (typeof TIPOS_FONDO)[number];

/**
 * UC-15 (Configurar fondo animado del sitio) — campos exactos según
 * docs/plan-portafolio.md: tipo, configuracion (velocidad, opacidad y, desde
 * la Fase 7b, intensidad e interactivo opcionales), activo.
 *
 * `activo` NO forma parte de este DTO a propósito: un fondo siempre se crea
 * inactivo (`activo: false` por default en el esquema); la única forma de
 * activarlo es `PATCH /admin/fondos/:id/activar`, que aplica la regla de
 * negocio de exclusividad (un solo fondo activo por administrador) dentro de
 * una transacción. Aceptar `activo` aquí permitiría saltarse esa regla.
 * Mismo criterio que `CreateTemaDto`, ver su comentario.
 */
export class CreateFondoSitioDto {
  @IsIn(TIPOS_FONDO)
  tipo: TipoFondo;

  @ValidateNested()
  @Type(() => FondoSitioConfiguracionDto)
  configuracion: FondoSitioConfiguracionDto;
}
