import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * Catálogo cerrado de `fuente_principal` (Fase 3.4): los 4 tokens nuevos que
 * el Select del frontend ofrece de ahora en adelante
 * (`'manrope'|'sans_sistema'|'serif_sistema'|'mono_sistema'`, cada uno
 * mapeado a un stack de fuentes que sí resuelve visualmente), MÁS los 4
 * valores legados (`'Inter'|'Poppins'|'Merriweather'|'Georgia'`) que ya
 * existen en `Tema` filas guardadas y en `apps/web` `plantillas-tema.ts` de
 * antes de este cambio, sin backfill de datos. El Select ya no ofrece estos
 * últimos 4, pero deben seguir siendo válidos: si no lo fueran, cualquier
 * `PATCH /admin/temas/:id` sobre un tema viejo (aunque no toque
 * `fuente_principal`, porque `UpdateTemaDto = PartialType(CreateTemaDto)`
 * revalida el campo si viene en el payload, y el frontend siempre reenvía
 * el objeto completo) sería rechazado con 400 por un valor que nunca fue
 * inválido para esa fila.
 */
const FUENTES_PRINCIPALES = [
  'manrope',
  'sans_sistema',
  'serif_sistema',
  'mono_sistema',
  'Inter',
  'Poppins',
  'Merriweather',
  'Georgia',
] as const;

type FuentePrincipal = (typeof FUENTES_PRINCIPALES)[number];

/**
 * UC-08 (Personalizar tema visual) — campos exactos según
 * docs/plan-portafolio.md: nombre, color_primario/secundario/fondo/texto,
 * fuente_principal, modo (claro/oscuro).
 *
 * `activo` NO forma parte de este DTO a propósito: un tema siempre se crea
 * inactivo (`activo: false` por default en el esquema); la única forma de
 * activarlo es `PATCH /admin/temas/:id/activar`, que aplica la regla de
 * negocio de exclusividad (un solo tema activo por administrador) dentro de
 * una transacción. Aceptar `activo` aquí permitiría saltarse esa regla.
 */
export class CreateTemaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  color_primario: string;

  @IsString()
  @IsNotEmpty()
  color_secundario: string;

  @IsString()
  @IsNotEmpty()
  color_fondo: string;

  @IsString()
  @IsNotEmpty()
  color_texto: string;

  @IsIn(FUENTES_PRINCIPALES)
  fuente_principal: FuentePrincipal;

  @IsIn(['claro', 'oscuro'])
  modo: 'claro' | 'oscuro';
}
