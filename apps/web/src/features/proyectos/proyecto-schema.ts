import { z } from 'zod'

const MENSAJE_FECHA_INVALIDA = 'Fecha inválida (AAAA-MM-DD)'

/** Fecha de "hoy" en formato `AAAA-MM-DD` (sin hora), para rechazar fechas futuras. */
const obtenerHoyISO = () => new Date().toISOString().slice(0, 10)

/** Espeja `CreateProyectoDto`/`UpdateProyectoDto` (tecnologías e imágenes tienen sus propios endpoints, no van en este DTO). */
export const proyectoSchema = z
  .object({
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
      .iso.date({ error: MENSAJE_FECHA_INVALIDA })
      .refine((fecha) => fecha <= obtenerHoyISO(), {
        message: 'La fecha de inicio no puede ser futura.',
      }),
    // Sin restricción de "no futura": un proyecto puede seguir planificado
    // a futuro.
    fecha_fin: z
      .iso.date({ error: MENSAJE_FECHA_INVALIDA })
      .optional()
      .or(z.literal('')),
    estado: z.string().min(1, 'El estado es obligatorio'),
    destacado: z.boolean(),
    orden: z.number().int('El orden debe ser un número entero'),
  })
  .superRefine((values, ctx) => {
    // Solo cuando ambas fechas están presentes: `fecha_fin` es opcional.
    // Posterior O IGUAL a `fecha_inicio` (un proyecto puede empezar y
    // terminar el mismo día).
    if (!values.fecha_inicio || !values.fecha_fin) return
    if (values.fecha_fin < values.fecha_inicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_fin'],
        message: 'La fecha de fin no puede ser anterior a la de inicio.',
      })
    }
  })

export type ProyectoFormValues = z.infer<typeof proyectoSchema>
