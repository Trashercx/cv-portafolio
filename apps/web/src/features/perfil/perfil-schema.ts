import { z } from 'zod'

/** Espeja exactamente `UpsertPerfilDto` (`apps/api/src/modules/perfil/dto/upsert-perfil.dto.ts`). */
export const perfilSchema = z.object({
  nombre_completo: z.string().min(1, 'El nombre completo es obligatorio'),
  titulo_profesional: z
    .string()
    .min(1, 'El título profesional es obligatorio'),
  resumen_bio: z.string().min(1, 'El resumen/bio es obligatorio'),
  imagen_perfil_id: z.string().uuid().optional(),
  cv_media_id: z.string().uuid().optional(),
  ubicacion: z.string().min(1, 'La ubicación es obligatoria'),
})

export type PerfilFormValues = z.infer<typeof perfilSchema>
