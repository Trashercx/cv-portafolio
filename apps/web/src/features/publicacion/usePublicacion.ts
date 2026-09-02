import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { SITIO_QUERY_KEY } from '@/features/publico/usePublico'
import type { VersionSitio } from './types'

export const VERSIONES_QUERY_KEY = ['versiones-sitio'] as const

/** `GET /admin/versiones` (UC-11): historial completo, más reciente primero. */
export function useVersiones() {
  return useQuery({
    queryKey: VERSIONES_QUERY_KEY,
    queryFn: () => apiFetch<VersionSitio[]>('/admin/versiones'),
  })
}

/**
 * `POST /admin/versiones/preview` (UC-10): arma el snapshot desde el
 * contenido en vivo y lo devuelve (queda guardado como fila `borrador`, de
 * ahí que también se invalide el historial).
 */
export function usePreviewVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<VersionSitio>('/admin/versiones/preview', { method: 'POST' }),
    meta: {
      mensajeError: 'No se pudo generar la vista previa. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VERSIONES_QUERY_KEY })
    },
  })
}

/**
 * `POST /admin/versiones/publicar` (UC-11): publica de inmediato al
 * público. Invalida también `GET /sitio` por si el admin tiene la home
 * pública abierta en otra pestaña durante pruebas.
 */
export function usePublicarVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiFetch<VersionSitio>('/admin/versiones/publicar', { method: 'POST' }),
    meta: {
      mensajeExito: 'Cambios publicados correctamente.',
      mensajeError: 'No se pudo publicar los cambios. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VERSIONES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SITIO_QUERY_KEY })
    },
  })
}

/**
 * `POST /admin/versiones/:id/revertir` (UC-11): crea una versión nueva
 * copiando el snapshot de la publicada anterior a `id`.
 */
export function useRevertirVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<VersionSitio>(`/admin/versiones/${id}/revertir`, {
        method: 'POST',
      }),
    meta: {
      mensajeExito: 'Se restauró la versión publicada anterior.',
      mensajeError: 'No se pudo revertir a la versión anterior. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VERSIONES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SITIO_QUERY_KEY })
    },
  })
}
