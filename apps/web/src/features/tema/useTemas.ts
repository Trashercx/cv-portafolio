import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { Tema } from './types'
import type { TemaFormValues } from './tema-schema'

export const TEMAS_QUERY_KEY = ['temas'] as const

/** `GET /admin/temas` (UC-08). */
export function useTemas() {
  return useQuery({
    queryKey: TEMAS_QUERY_KEY,
    queryFn: () => apiFetch<Tema[]>('/admin/temas'),
  })
}

/** `POST /admin/temas` — siempre se crea inactivo (regla de negocio del backend). */
export function useCrearTema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TemaFormValues) =>
      apiFetch<Tema>('/admin/temas', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMAS_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/temas/:id`. */
export function useActualizarTema(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<TemaFormValues>) =>
      apiFetch<Tema>(`/admin/temas/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMAS_QUERY_KEY })
    },
  })
}

/** `DELETE /admin/temas/:id`. */
export function useEliminarTema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/temas/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMAS_QUERY_KEY })
    },
  })
}

/**
 * `PATCH /admin/temas/:id/activar` (sin body): desactiva cualquier otro
 * tema del admin y activa este (exclusividad reforzada en el backend con
 * una transacción, UC-08).
 */
export function useActivarTema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Tema>(`/admin/temas/${id}/activar`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMAS_QUERY_KEY })
    },
  })
}
