import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { FondoSitio } from './types'
import type { FondoSitioFormValues } from './fondo-sitio-schema'

export const FONDOS_SITIO_QUERY_KEY = ['fondos-sitio'] as const

/** `GET /admin/fondos` (UC-15). */
export function useFondosSitio() {
  return useQuery({
    queryKey: FONDOS_SITIO_QUERY_KEY,
    queryFn: () => apiFetch<FondoSitio[]>('/admin/fondos'),
  })
}

/** `POST /admin/fondos` — siempre se crea inactivo (regla de negocio del backend). */
export function useCrearFondoSitio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: FondoSitioFormValues) =>
      apiFetch<FondoSitio>('/admin/fondos', { method: 'POST', body: payload }),
    meta: {
      mensajeExito: 'Fondo creado correctamente.',
      mensajeError: 'No se pudo crear el fondo. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FONDOS_SITIO_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/fondos/:id`. */
export function useActualizarFondoSitio(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<FondoSitioFormValues>) =>
      apiFetch<FondoSitio>(`/admin/fondos/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Fondo guardado correctamente.',
      mensajeError: 'No se pudo guardar el fondo. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FONDOS_SITIO_QUERY_KEY })
    },
  })
}

/** `DELETE /admin/fondos/:id`. */
export function useEliminarFondoSitio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/fondos/${id}`, {
        method: 'DELETE',
      }),
    meta: {
      mensajeExito: 'Fondo eliminado correctamente.',
      mensajeError: 'No se pudo eliminar el fondo. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FONDOS_SITIO_QUERY_KEY })
    },
  })
}

/**
 * `PATCH /admin/fondos/:id/activar` (sin body): desactiva cualquier otro
 * fondo del admin y activa este (exclusividad reforzada en el backend con
 * una transacción, UC-15).
 */
export function useActivarFondoSitio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<FondoSitio>(`/admin/fondos/${id}/activar`, { method: 'PATCH' }),
    meta: {
      mensajeExito: 'Fondo activado correctamente.',
      mensajeError: 'No se pudo activar el fondo. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FONDOS_SITIO_QUERY_KEY })
    },
  })
}
