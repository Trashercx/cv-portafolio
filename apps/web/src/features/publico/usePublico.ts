import { useQuery } from '@tanstack/react-query'
import type { Proyecto } from '@/features/proyectos/types'
import { ApiError, apiFetch } from '@/lib/api-client'
import type { CertificacionPublica, SnapshotSitio } from './types'

export const SITIO_QUERY_KEY = ['sitio-publico'] as const

/**
 * `GET /sitio` (UC-12): snapshot completo de la última versión publicada.
 * El backend responde 404 cuando nunca se publicó nada — se traduce a
 * `data: null` (no un `error`) para que la home pueda mostrar un estado
 * vacío razonable en vez de un error crudo.
 */
export function useSitio() {
  return useQuery({
    queryKey: SITIO_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<SnapshotSitio>('/sitio', {
          conCredenciales: false,
        })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}

export const proyectoPublicoQueryKey = (id: string) =>
  ['proyecto-publico', id] as const

/**
 * `GET /proyectos/:id` (UC-13), contra el snapshot publicado. `retry: false`
 * porque un 404/400 (id inexistente o mal formado) es un resultado esperado
 * del visitante navegando a un enlace roto, no un error transitorio de red.
 */
export function useProyectoPublico(id: string | undefined) {
  return useQuery({
    queryKey: proyectoPublicoQueryKey(id ?? ''),
    queryFn: () =>
      apiFetch<Proyecto>(`/proyectos/${id}`, { conCredenciales: false }),
    enabled: Boolean(id),
    retry: false,
  })
}

export const certificacionPublicaQueryKey = (id: string) =>
  ['certificacion-publica', id] as const

/** `GET /certificaciones/:id` (UC-13), contra el snapshot publicado. */
export function useCertificacionPublica(id: string | undefined) {
  return useQuery({
    queryKey: certificacionPublicaQueryKey(id ?? ''),
    queryFn: () =>
      apiFetch<CertificacionPublica>(`/certificaciones/${id}`, {
        conCredenciales: false,
      }),
    enabled: Boolean(id),
    retry: false,
  })
}
