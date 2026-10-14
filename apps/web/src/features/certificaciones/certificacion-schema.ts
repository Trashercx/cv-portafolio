import { z } from 'zod'

const MENSAJE_FECHA_INVALIDA = 'Fecha inválida (AAAA-MM-DD)'

/** Fecha de "hoy" en formato `AAAA-MM-DD` (sin hora), para rechazar fechas futuras. */
const obtenerHoyISO = () => new Date().toISOString().slice(0, 10)

/** Espeja `CreateCertificacionDto`/`UpdateCertificacionDto`. */
export const certificacionSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    institucion: z.string().min(1, 'La institución es obligatoria'),
    fecha_emision: z
      .iso.date({ error: MENSAJE_FECHA_INVALIDA })
      .refine((fecha) => fecha <= obtenerHoyISO(), {
        message: 'La fecha de emisión no puede ser futura.',
      }),
    fecha_expiracion: z
      .iso.date({ error: MENSAJE_FECHA_INVALIDA })
      .optional()
      .or(z.literal('')),
    // Fase 7e, UC-04: casilla "No expira"; desmarcada, la fecha de expiración es obligatoria.
    no_expira: z.boolean(),
    url_verificacion: z
      .string()
      .min(1, 'La URL de verificación es obligatoria')
      .url('URL inválida'),
    credencial_id: z.string().optional().or(z.literal('')),
    logo_media_id: z.string().uuid().optional(),
    orden: z.number().int('El orden debe ser un número entero'),
  })
  .superRefine((values, ctx) => {
    if (values.no_expira) return
    if (!values.fecha_expiracion) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_expiracion'],
        message: 'La fecha de expiración es obligatoria.',
      })
      return
    }
    // Solo cuando ambas fechas están presentes: la expiración es opcional,
    // así que no hay nada que comparar si todavía no se cargó.
    if (!values.fecha_emision || !values.fecha_expiracion) return
    if (values.fecha_expiracion <= values.fecha_emision) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_expiracion'],
        message: 'La fecha de expiración debe ser posterior a la de emisión.',
      })
    }
  })

export type CertificacionFormValues = z.infer<typeof certificacionSchema>
