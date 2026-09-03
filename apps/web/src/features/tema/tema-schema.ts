import { z } from 'zod'

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

/** Espeja `CreateTemaDto`/`UpdateTemaDto`. `activo` no forma parte del formulario: siempre se crea inactivo (ver backend). */
export const temaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  color_primario: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_secundario: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_fondo: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_texto: z.string().regex(HEX_REGEX, 'Color inválido'),
  // Solo los 4 tokens nuevos (con stack de `font-family` que sí resuelve,
  // ver `lib/tema-css.ts`) son válidos para CREAR/EDITAR desde este
  // formulario. Los valores legados ('Inter'/'Poppins'/'Merriweather'/
  // 'Georgia') de temas ya guardados se siguen leyendo y mostrando sin
  // problema (passthrough en `temaComoVariablesCss`), pero ya no se ofrecen
  // como opción de entrada acá.
  fuente_principal: z.enum([
    'manrope',
    'sans_sistema',
    'serif_sistema',
    'mono_sistema',
  ]),
  modo: z.enum(['claro', 'oscuro']),
})

export type TemaFormValues = z.infer<typeof temaSchema>
