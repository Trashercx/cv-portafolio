import { z } from 'zod'
import type { Skill } from './types'

/**
 * Espeja `CreateSkillDto`/`UpdateSkillDto`, más una validación de duplicado
 * "en vivo" (UX anticipada): el backend YA responde 409 con un mensaje
 * legible como red de seguridad ante condiciones de carrera, esto no lo
 * reemplaza, solo evita el viaje al servidor en el caso común.
 *
 * Es una función (no un objeto Zod fijo) porque el conjunto de nombres ya
 * usados cambia según qué skills existan en ese momento — `SkillFormDialog`
 * la reconstruye en cada render con la lista fresca de `useSkills()`.
 *
 * @param skillsExistentes catálogo actual completo de skills.
 * @param idActual al editar, el `id` del skill en edición (se excluye de la
 *   comparación para poder guardar sin tocar el nombre).
 */
export function crearSkillSchema(skillsExistentes: Skill[] = [], idActual?: string) {
  return z
    .object({
      nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
      icono: z.string().min(1, 'El ícono es obligatorio'),
      orden: z.number().int('El orden debe ser un número entero'),
      visible: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const nombreNormalizado = values.nombre.trim().toLowerCase()
      const yaExiste = skillsExistentes.some(
        (skill) =>
          skill.id !== idActual &&
          skill.nombre.trim().toLowerCase() === nombreNormalizado,
      )
      if (yaExiste) {
        ctx.addIssue({
          code: 'custom',
          path: ['nombre'],
          message: 'Ya existe un skill con ese nombre.',
        })
      }
    })
}

export type SkillFormValues = z.infer<ReturnType<typeof crearSkillSchema>>
