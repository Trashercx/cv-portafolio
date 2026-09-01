import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api-client'
import type { Media } from './types'

export const MEDIA_QUERY_KEY = ['media'] as const
export const mediaListQueryKey = (tipo?: string) => [...MEDIA_QUERY_KEY, { tipo: tipo ?? null }] as const

/** `GET /admin/media?tipo=` (UC-09): biblioteca completa, filtro opcional por `tipo`. */
export function useMediaList(tipo?: string) {
  return useQuery({
    queryKey: mediaListQueryKey(tipo),
    queryFn: () => {
      const query = tipo ? `?tipo=${encodeURIComponent(tipo)}` : ''
      return apiFetch<Media[]>(`/admin/media${query}`)
    },
  })
}

/** `PATCH /admin/media/:id`: edición de `alt_text`. */
export function useActualizarMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, alt_text }: { id: string; alt_text: string }) =>
      apiFetch<Media>(`/admin/media/${id}`, {
        method: 'PATCH',
        body: { alt_text },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}

/**
 * `DELETE /admin/media/:id` (UC-09). Si el archivo está en uso el backend
 * responde 409 (`ApiError`); el llamador debe mostrar `error.message` sin
 * quitar el elemento de la lista (no se invalida la query en el catch).
 */
export function useEliminarMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/media/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}

export type ReemplazarMediaPayload = {
  id: string
  file: File
  carpeta?: 'perfil' | 'proyectos' | 'certificaciones' | 'logros'
}

/** `PATCH /admin/media/:id/reemplazar`: sube un archivo nuevo sobre la misma fila (mismo `id`). */
export function useReemplazarMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file, carpeta }: ReemplazarMediaPayload) => {
      const formData = new FormData()
      formData.append('file', file)
      if (carpeta) formData.append('carpeta', carpeta)

      return apiUpload<Media>(`/admin/media/${id}/reemplazar`, formData, 'PATCH')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}
