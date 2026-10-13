import { z } from 'zod'
import { CLAVES_FUENTE } from './fuentes'

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

/** Espeja `CreateTemaDto`/`UpdateTemaDto`. `activo` no forma parte del formulario: siempre se crea inactivo (ver backend). */
export const temaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  color_primario: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_secundario: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_fondo: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_texto: z.string().regex(HEX_REGEX, 'Color inválido'),
  // Fase 7 (UC-08): catálogo cerrado de 10 fuentes (`fuentes.ts`, contrato
  // 7.2 de `docs/plan-tecnico.md`). Los valores legados ('Inter'/'Poppins'/
  // 'Merriweather'/'Georgia') de temas ya guardados se siguen leyendo y
  // mostrando (`familiaCssDeFuente`), pero ya no se ofrecen como entrada: el
  // formulario de edición los normaliza a su equivalente del catálogo.
  fuente_principal: z.enum(CLAVES_FUENTE),
  modo: z.enum(['claro', 'oscuro']),
})

export type TemaFormValues = z.infer<typeof temaSchema>
