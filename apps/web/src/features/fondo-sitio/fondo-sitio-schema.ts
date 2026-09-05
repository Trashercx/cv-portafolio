import { z } from 'zod'

/** Espeja `CreateFondoSitioDto`/`UpdateFondoSitioDto`. `activo` no forma parte del formulario: siempre se crea inactivo (ver backend). */
export const fondoSitioSchema = z.object({
  tipo: z.enum([
    'solido',
    'degradado_animado',
    'aurora_animada',
    'particulas',
    'cuadricula_animada',
    'ondas',
    'malla_difusa',
    'lineas_diagonales',
  ]),
  configuracion: z.object({
    velocidad: z.enum(['lenta', 'media', 'rapida']),
    opacidad: z
      .number()
      .min(0, 'La opacidad debe ser al menos 0')
      .max(1, 'La opacidad debe ser como máximo 1'),
  }),
})

export type FondoSitioFormValues = z.infer<typeof fondoSitioSchema>
