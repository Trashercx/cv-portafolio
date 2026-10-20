import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PROYECTOS_QUERY_KEY } from '@/features/proyectos/useProyectos'
import { apiFetch } from '@/lib/api-client'
import type {
  IntegracionGithub,
  IntegracionGithubPayload,
  ResultadoSincronizacionGithub,
} from './types'

export const INTEGRACION_GITHUB_QUERY_KEY = ['integracion-github'] as const

/** `GET /admin/integraciones/github`: la integración o `null` si todavía no existe. */
export function useIntegracionGithub() {
  return useQuery({
    queryKey: INTEGRACION_GITHUB_QUERY_KEY,
    queryFn: () => apiFetch<IntegracionGithub | null>('/admin/integraciones/github'),
  })
}

/** `PUT /admin/integraciones/github`: crea o actualiza la configuración. */
export function useGuardarIntegracionGithub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IntegracionGithubPayload) =>
      apiFetch<IntegracionGithub>('/admin/integraciones/github', {
        method: 'PUT',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Integración con GitHub guardada.',
      mensajeError: 'No se pudo guardar la integración con GitHub. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTEGRACION_GITHUB_QUERY_KEY })
    },
  })
}

/**
 * `PATCH /admin/proyectos/:id { sincronizar_github }`: "Mantener sincronizado" de un
 * proyecto importado. Apagarlo lo congela para editarlo a mano (UC-36).
 */
export function useAlternarSincronizacionProyecto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sincronizar_github }: { id: string; sincronizar_github: boolean }) =>
      apiFetch<unknown>(`/admin/proyectos/${id}`, {
        method: 'PATCH',
        body: { sincronizar_github },
      }),
    meta: {
      mensajeError: 'No se pudo cambiar la sincronización del proyecto. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `POST /admin/integraciones/github/sincronizar`: sincronización manual; refresca la lista de proyectos. */
export function useSincronizarGithub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<ResultadoSincronizacionGithub>('/admin/integraciones/github/sincronizar', {
        method: 'POST',
      }),
    meta: {
      mensajeError: 'No se pudo sincronizar con GitHub. Intenta de nuevo.',
    },
    onSuccess: () => {
      // Pueden haberse creado o actualizado proyectos, y `ultima_sincronizacion_en`/`ultimo_error` cambian.
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: INTEGRACION_GITHUB_QUERY_KEY })
    },
  })
}
