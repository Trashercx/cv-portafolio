import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { ItemConOrdenYId } from '@/lib/reorder'
import type { RedSocial } from './types'

export const REDES_SOCIALES_QUERY_KEY = ['redes-sociales'] as const
export const redSocialQueryKey = (id: string) => ['redes-sociales', id] as const

/** `GET /admin/redes-sociales`. */
export function useRedesSociales() {
  return useQuery({
    queryKey: REDES_SOCIALES_QUERY_KEY,
    queryFn: () => apiFetch<RedSocial[]>('/admin/redes-sociales'),
  })
}

/** `GET /admin/redes-sociales/:id`. */
export function useRedSocial(id: string | undefined) {
  return useQuery({
    queryKey: redSocialQueryKey(id ?? ''),
    queryFn: () => apiFetch<RedSocial>(`/admin/redes-sociales/${id}`),
    enabled: Boolean(id),
  })
}

export type RedSocialPayload = {
  plataforma_id: string
  url: string
  orden: number
}

/** `POST /admin/redes-sociales`. */
export function useCrearRedSocial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RedSocialPayload) =>
      apiFetch<RedSocial>('/admin/redes-sociales', {
        method: 'POST',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Enlace creado correctamente.',
      mensajeError: 'No se pudo crear el enlace. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REDES_SOCIALES_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/redes-sociales/:id`. También se usa para el subir/bajar (sin endpoint bulk de reordenar). */
export function useActualizarRedSocial(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<RedSocialPayload>) =>
      apiFetch<RedSocial>(`/admin/redes-sociales/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Enlace guardado correctamente.',
      mensajeError: 'No se pudo guardar el enlace. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REDES_SOCIALES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: redSocialQueryKey(id) })
    },
  })
}

/** `DELETE /admin/redes-sociales/:id`. */
export function useEliminarRedSocial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/redes-sociales/${id}`, {
        method: 'DELETE',
      }),
    meta: {
      mensajeExito: 'Enlace eliminado correctamente.',
      mensajeError: 'No se pudo eliminar el enlace. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REDES_SOCIALES_QUERY_KEY })
    },
  })
}

/** Reordenar subiendo/bajando: dos `PATCH .../:id` (no hay endpoint bulk para redes sociales). */
export function useReordenarRedesSociales() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: ItemConOrdenYId[]) => {
      await Promise.all(
        items.map((item) =>
          apiFetch(`/admin/redes-sociales/${item.id}`, {
            method: 'PATCH',
            body: { orden: item.orden },
          }),
        ),
      )
    },
    meta: {
      mensajeError: 'No se pudo reordenar los enlaces. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REDES_SOCIALES_QUERY_KEY })
    },
  })
}
