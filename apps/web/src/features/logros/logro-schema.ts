import { z } from 'zod'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Espeja `CreateLogroDto`/`UpdateLogroDto`. */
export const logroSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  fecha: z
    .string()
    .min(1, 'La fecha es obligatoria')
    .regex(FECHA_REGEX, 'Fecha inválida (AAAA-MM-DD)'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  url_referencia: z.string().url('URL inválida').optional().or(z.literal('')),
  orden: z.number().int('El orden debe ser un número entero'),
})

export type LogroFormValues = z.infer<typeof logroSchema>
