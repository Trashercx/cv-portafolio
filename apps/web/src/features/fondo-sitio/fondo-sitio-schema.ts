import { z } from 'zod'
import { TIPOS_FONDO } from './catalogo-fondos'

/** Espeja `CreateFondoSitioDto`/`UpdateFondoSitioDto` (Fase 7b: 9 tipos y dos campos opcionales). `activo` no forma parte del formulario: siempre se crea inactivo (ver backend). */
export const fondoSitioSchema = z.object({
  tipo: z.enum(TIPOS_FONDO),
  configuracion: z.object({
    velocidad: z.enum(['lenta', 'media', 'rapida']),
    opacidad: z
      .number()
      .min(0, 'La opacidad debe ser al menos 0')
      .max(1, 'La opacidad debe ser como máximo 1'),
    intensidad: z.enum(['sutil', 'media', 'alta']).optional(),
    interactivo: z.boolean().optional(),
  }),
})

export type FondoSitioFormValues = z.infer<typeof fondoSitioSchema>
