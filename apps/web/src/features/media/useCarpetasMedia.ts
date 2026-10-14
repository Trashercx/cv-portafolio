import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { CarpetaMedia } from './types'

export const carpetasMediaQueryKey = ['media', 'carpetas'] as const

/** `GET /admin/media/carpetas` (Fase 7e, UC-09): carpetas ordenadas con su total. */
export function useCarpetasMedia() {
  return useQuery({
    queryKey: carpetasMediaQueryKey,
    queryFn: () => apiFetch<CarpetaMedia[]>('/admin/media/carpetas'),
  })
}

/**
 * Todas las mutaciones de carpetas invalidan `['media']` (raíz: cubre la lista
 * filtrada por carpeta y `['media','carpetas']` con los totales).
 */
function useInvalidarMedia() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['media'] })
}

/** `POST /admin/media/carpetas` (Fase 7e, UC-09): 409 si el nombre ya existe; el diálogo muestra el error. */
export function useCrearCarpeta() {
  const invalidar = useInvalidarMedia()
  return useMutation({
    mutationFn: (nombre: string) =>
      apiFetch<CarpetaMedia>('/admin/media/carpetas', { method: 'POST', body: { nombre } }),
    onSuccess: invalidar,
    meta: { mensajeExito: 'Carpeta creada.' },
  })
}

/** `PATCH /admin/media/carpetas/:id` (Fase 7e, UC-09): renombra. */
export function useRenombrarCarpeta() {
  const invalidar = useInvalidarMedia()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiFetch<CarpetaMedia>(`/admin/media/carpetas/${id}`, {
        method: 'PATCH',
        body: { nombre },
      }),
    onSuccess: invalidar,
    meta: { mensajeExito: 'Carpeta renombrada.' },
  })
}

/** `PATCH /admin/media/carpetas/reordenar` (Fase 7e, UC-09): `ids` en el orden nuevo. */
export function useReordenarCarpetas() {
  const invalidar = useInvalidarMedia()
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<unknown>('/admin/media/carpetas/reordenar', {
        method: 'PATCH',
        body: { ids },
      }),
    onSuccess: invalidar,
    meta: { mensajeError: 'No se pudo reordenar las carpetas.' },
  })
}

/** `DELETE /admin/media/carpetas/:id` (Fase 7e, UC-09): los archivos quedan sin carpeta. */
export function useEliminarCarpeta() {
  const invalidar = useInvalidarMedia()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/admin/media/carpetas/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
    meta: {
      mensajeExito: 'Carpeta eliminada. Sus archivos quedaron sin carpeta.',
      mensajeError: 'No se pudo eliminar la carpeta.',
    },
  })
}

/** `POST /admin/media/mover` (Fase 7e, UC-09): `carpeta_id: null` = "Sin carpeta". */
export function useMoverMedia() {
  const invalidar = useInvalidarMedia()
  return useMutation({
    mutationFn: ({ ids, carpeta_id }: { ids: string[]; carpeta_id: string | null }) =>
      apiFetch<{ movidos: number }>('/admin/media/mover', {
        method: 'POST',
        body: { ids, carpeta_id },
      }),
    onSuccess: invalidar,
    meta: {
      mensajeExito: 'Archivos movidos.',
      mensajeError: 'No se pudieron mover los archivos.',
    },
  })
}
