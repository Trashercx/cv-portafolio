import { z } from 'zod'

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

/** Espeja `CreateTemaDto`/`UpdateTemaDto`. `activo` no forma parte del formulario: siempre se crea inactivo (ver backend). */
export const temaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  color_primario: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_secundario: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_fondo: z.string().regex(HEX_REGEX, 'Color inválido'),
  color_texto: z.string().regex(HEX_REGEX, 'Color inválido'),
  fuente_principal: z.string().min(1, 'La tipografía es obligatoria'),
  modo: z.enum(['claro', 'oscuro']),
})

export type TemaFormValues = z.infer<typeof temaSchema>
