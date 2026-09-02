import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { ItemConOrdenYId } from '@/lib/reorder'
import type { Skill } from './types'

export const SKILLS_QUERY_KEY = ['skills'] as const
export const skillQueryKey = (id: string) => ['skills', id] as const

/** `GET /admin/skills`. */
export function useSkills() {
  return useQuery({
    queryKey: SKILLS_QUERY_KEY,
    queryFn: () => apiFetch<Skill[]>('/admin/skills'),
  })
}

/** `GET /admin/skills/:id`. */
export function useSkill(id: string | undefined) {
  return useQuery({
    queryKey: skillQueryKey(id ?? ''),
    queryFn: () => apiFetch<Skill>(`/admin/skills/${id}`),
    enabled: Boolean(id),
  })
}

export type SkillPayload = {
  nombre: string
  icono: string
  orden: number
  visible?: boolean
}

/** `POST /admin/skills`. */
export function useCrearSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SkillPayload) =>
      apiFetch<Skill>('/admin/skills', { method: 'POST', body: payload }),
    meta: {
      mensajeExito: 'Skill creado correctamente.',
      mensajeError: 'No se pudo crear el skill. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/skills/:id`. También se usa para el subir/bajar (sin endpoint bulk de reordenar). */
export function useActualizarSkill(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<SkillPayload>) =>
      apiFetch<Skill>(`/admin/skills/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Skill guardado correctamente.',
      mensajeError: 'No se pudo guardar el skill. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: skillQueryKey(id) })
    },
  })
}

/** `DELETE /admin/skills/:id`. */
export function useEliminarSkill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/skills/${id}`, {
        method: 'DELETE',
      }),
    meta: {
      mensajeExito: 'Skill eliminado correctamente.',
      mensajeError: 'No se pudo eliminar el skill. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY })
    },
  })
}

/** Reordenar subiendo/bajando: dos `PATCH .../:id` (no hay endpoint bulk para skills). */
export function useReordenarSkills() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: ItemConOrdenYId[]) => {
      await Promise.all(
        items.map((item) =>
          apiFetch(`/admin/skills/${item.id}`, {
            method: 'PATCH',
            body: { orden: item.orden },
          }),
        ),
      )
    },
    meta: {
      mensajeError: 'No se pudo reordenar los skills. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY })
    },
  })
}
