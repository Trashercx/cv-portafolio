import { z } from 'zod'

const MENSAJE_FECHA_INVALIDA = 'Fecha inválida (AAAA-MM-DD)'

/** Fecha de "hoy" en formato `AAAA-MM-DD` (sin hora), para rechazar fechas futuras. */
const obtenerHoyISO = () => new Date().toISOString().slice(0, 10)

/** Espeja `CreateLogroDto`/`UpdateLogroDto`. */
export const logroSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  fecha: z
    .iso.date({ error: MENSAJE_FECHA_INVALIDA })
    .refine((fecha) => fecha <= obtenerHoyISO(), {
      message: 'La fecha no puede ser futura.',
    }),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  url_referencia: z.string().url('URL inválida').optional().or(z.literal('')),
  orden: z.number().int('El orden debe ser un número entero'),
})

export type LogroFormValues = z.infer<typeof logroSchema>
