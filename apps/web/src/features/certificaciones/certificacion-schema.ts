import { z } from 'zod'

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Espeja `CreateCertificacionDto`/`UpdateCertificacionDto`. */
export const certificacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  institucion: z.string().min(1, 'La institución es obligatoria'),
  fecha_emision: z
    .string()
    .min(1, 'La fecha de emisión es obligatoria')
    .regex(FECHA_REGEX, 'Fecha inválida (AAAA-MM-DD)'),
  fecha_expiracion: z
    .string()
    .regex(FECHA_REGEX, 'Fecha inválida (AAAA-MM-DD)')
    .optional()
    .or(z.literal('')),
  url_verificacion: z
    .string()
    .min(1, 'La URL de verificación es obligatoria')
    .url('URL inválida'),
  credencial_id: z.string().optional().or(z.literal('')),
  logo_media_id: z.string().uuid().optional(),
  orden: z.number().int('El orden debe ser un número entero'),
})

export type CertificacionFormValues = z.infer<typeof certificacionSchema>
