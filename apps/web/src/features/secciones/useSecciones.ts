import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { Seccion, TipoSeccion } from './types'

export const SECCIONES_QUERY_KEY = ['secciones'] as const

/** `GET /admin/secciones` (UC-07): lista completa, sin filtrar por visibilidad. */
export function useSecciones() {
  return useQuery({
    queryKey: SECCIONES_QUERY_KEY,
    queryFn: () => apiFetch<Seccion[]>('/admin/secciones'),
  })
}

export type CrearSeccionPayload = {
  tipo_seccion: TipoSeccion
  titulo_visible: string
  orden: number
  visible?: boolean
  configuracion: Record<string, unknown>
}

/** `POST /admin/secciones`. */
export function useCrearSeccion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CrearSeccionPayload) =>
      apiFetch<Seccion>('/admin/secciones', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECCIONES_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/secciones/:id` — solo `titulo_visible` es editable por esta vía. */
export function useActualizarSeccion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, titulo_visible }: { id: string; titulo_visible: string }) =>
      apiFetch<Seccion>(`/admin/secciones/${id}`, {
        method: 'PATCH',
        body: { titulo_visible },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECCIONES_QUERY_KEY })
    },
  })
}

/** `DELETE /admin/secciones/:id`. */
export function useEliminarSeccion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/secciones/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECCIONES_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/secciones/:id/visibilidad`. */
export function useActualizarVisibilidadSeccion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      apiFetch<Seccion>(`/admin/secciones/${id}/visibilidad`, {
        method: 'PATCH',
        body: { visible },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECCIONES_QUERY_KEY })
    },
  })
}

/**
 * `PATCH /admin/secciones/:id/configuracion` — el body es el objeto
 * `configuracion` correspondiente al `tipo_seccion` de esa fila (validado en
 * el backend contra el DTO específico, ver `CONFIGURACION_DTO_POR_TIPO`).
 */
export function useActualizarConfiguracionSeccion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      configuracion,
    }: {
      id: string
      configuracion: Record<string, unknown>
    }) =>
      apiFetch<Seccion>(`/admin/secciones/${id}/configuracion`, {
        method: 'PATCH',
        body: configuracion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECCIONES_QUERY_KEY })
    },
  })
}

export type ReordenarSeccionItem = { id: string; orden: number }

/** `PATCH /admin/secciones/reordenar` (bulk). */
export function useReordenarSecciones() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: ReordenarSeccionItem[]) =>
      apiFetch<{ actualizados: number }>('/admin/secciones/reordenar', {
        method: 'PATCH',
        body: items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SECCIONES_QUERY_KEY })
    },
  })
}
