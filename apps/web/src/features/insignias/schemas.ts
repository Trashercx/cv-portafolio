import { z } from 'zod'

const MENSAJE_FECHA_INVALIDA = 'Fecha inválida (AAAA-MM-DD)'

/**
 * Formulario de insignia (Fase 7d, UC-35): sirve para la vista previa editable
 * de la importación, el alta manual y la edición. Espeja `CreateInsigniaDto`:
 * nombre y emisor obligatorios; la imagen es `imagen_media_id` **o**
 * `imagen_url_remota` (https), al menos una.
 */
export const insigniaSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
    emisor: z.string().trim().min(1, 'El emisor es obligatorio').max(200),
    descripcion: z.string().optional(),
    fecha_emision: z.iso.date({ error: MENSAJE_FECHA_INVALIDA }).optional().or(z.literal('')),
    fecha_expiracion: z.iso.date({ error: MENSAJE_FECHA_INVALIDA }).optional().or(z.literal('')),
    habilidades: z.array(z.string().trim().min(1)).max(50),
    url_verificacion: z.string().url('URL inválida').optional().or(z.literal('')),
    imagen_media_id: z.string().min(1).optional(),
    imagen_url_remota: z
      .string()
      .url('URL inválida')
      .refine((valor) => valor.startsWith('https://'), 'La imagen debe ser https')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (!values.imagen_media_id && !values.imagen_url_remota) {
      ctx.addIssue({
        code: 'custom',
        path: ['imagen_media_id'],
        message: 'La imagen es obligatoria.',
      })
    }
    if (
      values.fecha_emision &&
      values.fecha_expiracion &&
      values.fecha_expiracion <= values.fecha_emision
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_expiracion'],
        message: 'La expiración debe ser posterior a la emisión.',
      })
    }
  })

export type InsigniaFormValues = z.infer<typeof insigniaSchema>

export const INSIGNIA_VALORES_VACIOS: InsigniaFormValues = {
  nombre: '',
  emisor: '',
  descripcion: '',
  fecha_emision: '',
  fecha_expiracion: '',
  habilidades: [],
  url_verificacion: '',
  imagen_media_id: undefined,
  imagen_url_remota: '',
}
