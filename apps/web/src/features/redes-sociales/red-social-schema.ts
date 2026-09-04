import { z } from 'zod'

/**
 * Coincide con un esquema URI genérico al inicio del valor (`http:`,
 * `https:`, `mailto:`, o cualquier esquema futuro) — RFC 3986 §3.1.
 */
const ESQUEMA_URI = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

/**
 * Espeja `CreateRedSocialDto`/`UpdateRedSocialDto`. `url` se valida solo
 * como texto no vacío (no con `.url()`): el catálogo incluye la plataforma
 * "Correo" con enlaces `mailto:...`, que un validador estricto de URL
 * rechazaría — igual que en el backend (ver comentario del DTO).
 *
 * Además se normaliza con `.transform()`: si el valor no trae ya un esquema
 * reconocible (`http:`, `https:`, `mailto:`, etc.), se le antepone
 * `https://`. Sin esto, un usuario que escribe `linkedin.com/in/usuario`
 * termina con un `<a href>` que el navegador resuelve como ruta relativa al
 * propio origen (navega al panel admin en vez de salir del sitio) — la
 * misma normalización se aplica en el backend (`CreateRedSocialDto`) como
 * defensa en profundidad.
 */
export const redSocialSchema = z.object({
  plataforma_id: z.string().uuid('Selecciona una plataforma'),
  url: z
    .string()
    .min(1, 'La URL es obligatoria')
    .transform((valor) => (ESQUEMA_URI.test(valor) ? valor : `https://${valor}`)),
  orden: z.number().int('El orden debe ser un número entero'),
})

export type RedSocialFormValues = z.infer<typeof redSocialSchema>
