import { z } from 'zod'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Espeja `CreateProyectoDto`/`UpdateProyectoDto` (tecnologías e imágenes tienen sus propios endpoints, no van en este DTO). */
export const proyectoSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  url_demo: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
  url_repositorio: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
  fecha_inicio: z
    .string()
    .regex(FECHA_REGEX, 'Fecha inválida (AAAA-MM-DD)'),
  fecha_fin: z
    .string()
    .regex(FECHA_REGEX, 'Fecha inválida (AAAA-MM-DD)')
    .optional()
    .or(z.literal('')),
  estado: z.string().min(1, 'El estado es obligatorio'),
  destacado: z.boolean(),
  orden: z.number().int('El orden debe ser un número entero'),
})

export type ProyectoFormValues = z.infer<typeof proyectoSchema>
