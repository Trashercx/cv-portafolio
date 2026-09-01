import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { ItemConOrdenYId } from '@/lib/reorder'
import type { Certificacion } from './types'

export const CERTIFICACIONES_QUERY_KEY = ['certificaciones'] as const
export const certificacionQueryKey = (id: string) =>
  ['certificaciones', id] as const

/** `GET /admin/certificaciones`: listadas por orden manual, desempatando por fecha de emisión (ver `CertificacionesService`). */
export function useCertificaciones() {
  return useQuery({
    queryKey: CERTIFICACIONES_QUERY_KEY,
    queryFn: () => apiFetch<Certificacion[]>('/admin/certificaciones'),
  })
}

/** `GET /admin/certificaciones/:id`. */
export function useCertificacion(id: string | undefined) {
  return useQuery({
    queryKey: certificacionQueryKey(id ?? ''),
    queryFn: () => apiFetch<Certificacion>(`/admin/certificaciones/${id}`),
    enabled: Boolean(id),
  })
}

export type CertificacionPayload = {
  nombre: string
  institucion: string
  fecha_emision: string
  fecha_expiracion?: string
  url_verificacion: string
  credencial_id?: string
  logo_media_id?: string
  orden: number
}

/** `POST /admin/certificaciones`. */
export function useCrearCertificacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CertificacionPayload) =>
      apiFetch<Certificacion>('/admin/certificaciones', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CERTIFICACIONES_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/certificaciones/:id`. También se usa para el subir/bajar (no hay endpoint bulk de reordenar para esta entidad). */
export function useActualizarCertificacion(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<CertificacionPayload>) =>
      apiFetch<Certificacion>(`/admin/certificaciones/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CERTIFICACIONES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: certificacionQueryKey(id) })
    },
  })
}

/** `DELETE /admin/certificaciones/:id`. */
export function useEliminarCertificacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/certificaciones/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CERTIFICACIONES_QUERY_KEY })
    },
  })
}

/**
 * No existe `PATCH /admin/certificaciones/reordenar` (a diferencia de
 * proyectos). El botón subir/bajar reordena con dos `PATCH .../:id`
 * (el `orden` ya es parte del DTO de actualización), uno por cada fila
 * intercambiada.
 */
export function useReordenarCertificaciones() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: ItemConOrdenYId[]) => {
      await Promise.all(
        items.map((item) =>
          apiFetch(`/admin/certificaciones/${item.id}`, {
            method: 'PATCH',
            body: { orden: item.orden },
          }),
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CERTIFICACIONES_QUERY_KEY })
    },
  })
}
