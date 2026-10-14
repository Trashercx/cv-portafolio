import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MEDIA_QUERY_KEY } from '@/features/media/useMediaLibrary'
import { apiFetch, apiUpload } from '@/lib/api-client'
import type { Insignia, ProveedorInsignia, VistaPreviaInsignia } from './types'

/** Fase 7d, UC-35. Las claves empiezan por `['insignias']`: una sola invalidación cubre lista y lienzo. */
export const INSIGNIAS_QUERY_KEY = ['insignias'] as const

/** `GET /admin/insignias` (ordenadas por `orden`). También alimenta el lienzo del editor (`useDatosEditor`). */
export function useInsignias() {
  return useQuery({
    queryKey: INSIGNIAS_QUERY_KEY,
    queryFn: () => apiFetch<Insignia[]>('/admin/insignias'),
  })
}

/** Cuerpo de `POST/PATCH /admin/insignias`: `imagen_media_id` o `imagen_url_remota`. */
export type InsigniaPayload = {
  nombre: string
  emisor: string
  descripcion?: string
  proveedor?: ProveedorInsignia
  id_externo?: string
  url_verificacion?: string
  url_origen?: string
  imagen_media_id?: string
  imagen_url_remota?: string
  fecha_emision?: string
  fecha_expiracion?: string
  habilidades?: string[]
  visible?: boolean
}

function useInvalidarInsignias() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: INSIGNIAS_QUERY_KEY })
    // Crear con `imagen_url_remota` o importar un archivo agrega media nueva a la biblioteca.
    queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
  }
}

/** `POST /admin/insignias`. */
export function useCrearInsignia() {
  const invalidar = useInvalidarInsignias()
  return useMutation({
    mutationFn: (payload: InsigniaPayload) =>
      apiFetch<Insignia>('/admin/insignias', { method: 'POST', body: payload }),
    meta: {
      mensajeExito: 'Insignia guardada correctamente.',
      mensajeError: 'No se pudo guardar la insignia. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `PATCH /admin/insignias/:id`. Sirve también para ocultar/mostrar (`{ visible }`). */
export function useActualizarInsignia() {
  const invalidar = useInvalidarInsignias()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<InsigniaPayload> }) =>
      apiFetch<Insignia>(`/admin/insignias/${id}`, { method: 'PATCH', body: payload }),
    meta: {
      mensajeExito: 'Insignia actualizada correctamente.',
      mensajeError: 'No se pudo actualizar la insignia. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `DELETE /admin/insignias/:id` (no borra la media). */
export function useEliminarInsignia() {
  const invalidar = useInvalidarInsignias()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/admin/insignias/${id}`, { method: 'DELETE' }),
    meta: {
      mensajeExito: 'Insignia eliminada correctamente.',
      mensajeError: 'No se pudo eliminar la insignia. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `PATCH /admin/insignias/reordenar` con `{ ids }` en el orden deseado. */
export function useReordenarInsignias() {
  const invalidar = useInvalidarInsignias()
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch<unknown>('/admin/insignias/reordenar', { method: 'PATCH', body: { ids } }),
    meta: {
      mensajeError: 'No se pudo reordenar las insignias. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `POST /admin/insignias/importar`: vista previa sin persistir (enlace, embed o URL de imagen). */
export function useImportarInsignia() {
  return useMutation({
    mutationFn: (entrada: string) =>
      apiFetch<VistaPreviaInsignia>('/admin/insignias/importar', {
        method: 'POST',
        body: { entrada },
      }),
    meta: {
      mensajeError: 'No se pudo analizar la entrada. Intenta de nuevo.',
    },
  })
}

/** `POST /admin/insignias/importar-archivo` (multipart `file`): sube a la biblioteca y devuelve la vista previa. */
export function useImportarArchivoInsignia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiUpload<VistaPreviaInsignia>('/admin/insignias/importar-archivo', formData)
    },
    meta: {
      mensajeError: 'No se pudo procesar el archivo. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
    },
  })
}
