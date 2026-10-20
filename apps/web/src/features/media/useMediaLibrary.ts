import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiUpload } from '@/lib/api-client'
import type {
  FiltrosMedia,
  Media,
  ResultadoEliminarLote,
  UsosPorMedia,
} from './types'

export const MEDIA_QUERY_KEY = ['media'] as const
export const mediaUsosQueryKey = [...MEDIA_QUERY_KEY, 'usos'] as const

function normalizarFiltros(filtros?: string | FiltrosMedia): Required<FiltrosMedia> {
  const f: FiltrosMedia = typeof filtros === 'string' ? { tipo: filtros } : (filtros ?? {})
  return {
    tipo: f.tipo ?? '',
    q: f.q?.trim() ?? '',
    orden: f.orden ?? 'reciente',
    carpeta_id: f.carpeta_id ?? '',
  }
}

export const mediaListQueryKey = (filtros?: string | FiltrosMedia) =>
  [...MEDIA_QUERY_KEY, 'lista', normalizarFiltros(filtros)] as const

/**
 * `GET /admin/media?tipo=&q=&orden=` (UC-09, Fase 7d): biblioteca con filtros.
 * Acepta un `string` (solo `tipo`, como los selectores de los formularios) o
 * el objeto de filtros de la biblioteca. Sin filtros comparte caché con el
 * resto de consumidores (`useDatosEditor`, `puck-config`).
 */
export function useMediaList(filtros?: string | FiltrosMedia) {
  const { tipo, q, orden, carpeta_id } = normalizarFiltros(filtros)
  return useQuery({
    queryKey: mediaListQueryKey(filtros),
    queryFn: () => {
      const params = new URLSearchParams()
      if (tipo) params.set('tipo', tipo)
      if (q) params.set('q', q)
      if (orden !== 'reciente') params.set('orden', orden)
      // Fase 7e (UC-09): `carpeta_id=<uuid>` o `ninguna`.
      if (carpeta_id) params.set('carpeta_id', carpeta_id)
      const query = params.toString()
      return apiFetch<Media[]>(`/admin/media${query ? `?${query}` : ''}`)
    },
  })
}

/** `GET /admin/media/usos` (Fase 7d, UC-09): dónde se usa cada archivo, en una pasada. */
export function useMediaUsos() {
  return useQuery({
    queryKey: mediaUsosQueryKey,
    queryFn: () => apiFetch<UsosPorMedia>('/admin/media/usos'),
    staleTime: 30_000,
  })
}

/**
 * `POST /admin/media/eliminar-lote` (Fase 7d, UC-09): los archivos en uso se
 * omiten (nunca 409 global); el llamador muestra `omitidos` con su motivo.
 */
export function useEliminarMediaLote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<ResultadoEliminarLote>('/admin/media/eliminar-lote', {
        method: 'POST',
        body: { ids },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
    meta: {
      mensajeError: 'No se pudieron eliminar los archivos seleccionados.',
    },
  })
}

/**
 * `GET /admin/media/:id`: el `Media` completo (con `url`/`tipo`) para un id
 * ya guardado en otra entidad (p. ej. `Certificacion.logo_media_id`), que
 * solo expone el id, no el objeto resuelto. Se usa para previsualizar
 * (imagen o PDF, ver `MediaPreview`) un archivo ya cargado sin depender de
 * que el formulario padre haya recibido una `Media` fresca en esta sesión.
 */
export function useMedia(id?: string) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, 'item', id] as const,
    queryFn: () => apiFetch<Media>(`/admin/media/${id}`),
    enabled: Boolean(id),
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
