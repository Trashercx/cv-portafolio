import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { ItemConOrdenYId } from '@/lib/reorder'
import type { Logro } from './types'

export const LOGROS_QUERY_KEY = ['logros'] as const
export const logroQueryKey = (id: string) => ['logros', id] as const

/** `GET /admin/logros`. */
export function useLogros() {
  return useQuery({
    queryKey: LOGROS_QUERY_KEY,
    queryFn: () => apiFetch<Logro[]>('/admin/logros'),
  })
}

/** `GET /admin/logros/:id`. */
export function useLogro(id: string | undefined) {
  return useQuery({
    queryKey: logroQueryKey(id ?? ''),
    queryFn: () => apiFetch<Logro>(`/admin/logros/${id}`),
    enabled: Boolean(id),
  })
}

export type LogroPayload = {
  titulo: string
  descripcion: string
  fecha: string
  categoria: string
  url_referencia?: string
  orden: number
}

/** `POST /admin/logros`. */
export function useCrearLogro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LogroPayload) =>
      apiFetch<Logro>('/admin/logros', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOGROS_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/logros/:id`. También se usa para el subir/bajar (sin endpoint bulk de reordenar). */
export function useActualizarLogro(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<LogroPayload>) =>
      apiFetch<Logro>(`/admin/logros/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOGROS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: logroQueryKey(id) })
    },
  })
}

/** `DELETE /admin/logros/:id`. */
export function useEliminarLogro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/logros/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOGROS_QUERY_KEY })
    },
  })
}

/** Reordenar subiendo/bajando: dos `PATCH .../:id` (no hay endpoint bulk para logros). */
export function useReordenarLogros() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: ItemConOrdenYId[]) => {
      await Promise.all(
        items.map((item) =>
          apiFetch(`/admin/logros/${item.id}`, {
            method: 'PATCH',
            body: { orden: item.orden },
          }),
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOGROS_QUERY_KEY })
    },
  })
}
