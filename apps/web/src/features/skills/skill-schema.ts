import { z } from 'zod'

/** Espeja `CreateSkillDto`/`UpdateSkillDto`. */
export const skillSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  icono: z.string().min(1, 'El ícono es obligatorio'),
  orden: z.number().int('El orden debe ser un número entero'),
  visible: z.boolean(),
})

export type SkillFormValues = z.infer<typeof skillSchema>
