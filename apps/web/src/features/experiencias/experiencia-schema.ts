import { z } from 'zod'
import type { ExperienciaPayload } from './useExperiencias'

const MENSAJE_FECHA_INVALIDA = 'Fecha inválida (AAAA-MM-DD)'

/**
 * Espeja `CreateExperienciaDto` (Fase 7l, UC-19). `actual` no viaja al API:
 * es solo la casilla del formulario; con `actual` la fecha de fin se ignora y
 * se envía `null` (ver `construirPayloadExperiencia`).
 */
export const experienciaSchema = z
  .object({
    empresa: z.string().trim().min(1, 'La empresa es obligatoria'),
    cargo: z.string().trim().min(1, 'El cargo es obligatorio'),
    // Opcional en el API (queda ''): un puesto puede mostrarse solo con cargo y empresa.
    descripcion: z.string().trim(),
    fecha_inicio: z.iso.date({ error: MENSAJE_FECHA_INVALIDA }),
    fecha_fin: z.iso.date({ error: MENSAJE_FECHA_INVALIDA }).optional().or(z.literal('')),
    actual: z.boolean(),
    ubicacion: z.string().trim().optional(),
    modalidad: z.enum(['presencial', 'remoto', 'hibrido'], { error: 'Elige una modalidad' }),
    url_empresa: z.string().trim().url('URL inválida').optional().or(z.literal('')),
    logo_media_id: z.string().nullable(),
    tecnologias: z.array(z.string()),
    visible: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.actual) return
    if (!values.fecha_fin) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_fin'],
        message: 'Indica la fecha de fin o marca "Actual".',
      })
      return
    }
    if (values.fecha_inicio && values.fecha_fin < values.fecha_inicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_fin'],
        message: 'La fecha de fin no puede ser anterior a la de inicio.',
      })
    }
  })

export type ExperienciaFormValues = z.infer<typeof experienciaSchema>

/**
 * Convierte los valores del formulario en el cuerpo del API (Fase 7l, UC-19):
 * con "Actual" la fecha de fin viaja `null` aunque el campo tenga un valor
 * viejo, y los textos opcionales vacíos viajan `null` (así `PATCH` también
 * puede borrarlos).
 */
export function construirPayloadExperiencia(
  values: ExperienciaFormValues,
  orden?: number,
): ExperienciaPayload {
  return {
    empresa: values.empresa.trim(),
    cargo: values.cargo.trim(),
    descripcion: values.descripcion.trim(),
    fecha_inicio: values.fecha_inicio,
    fecha_fin: values.actual ? null : values.fecha_fin || null,
    ubicacion: values.ubicacion?.trim() || null,
    modalidad: values.modalidad,
    url_empresa: values.url_empresa?.trim() || null,
    logo_media_id: values.logo_media_id,
    tecnologias: values.tecnologias,
    visible: values.visible,
    ...(orden === undefined ? {} : { orden }),
  }
}
