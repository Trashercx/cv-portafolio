import { z } from 'zod'

/**
 * Espeja `CreateRedSocialDto`/`UpdateRedSocialDto`. `url` se valida solo
 * como texto no vacío (no con `.url()`): el catálogo incluye la plataforma
 * "Correo" con enlaces `mailto:...`, que un validador estricto de URL
 * rechazaría — igual que en el backend (ver comentario del DTO).
 */
export const redSocialSchema = z.object({
  plataforma_id: z.string().uuid('Selecciona una plataforma'),
  url: z.string().min(1, 'La URL es obligatoria'),
  orden: z.number().int('El orden debe ser un número entero'),
})

export type RedSocialFormValues = z.infer<typeof redSocialSchema>
