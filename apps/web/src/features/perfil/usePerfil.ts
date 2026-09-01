import { useQuery } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api-client'
import type { Perfil } from './types'

export const PERFIL_QUERY_KEY = ['perfil'] as const

/**
 * `GET /admin/perfil`: fila única. El backend devuelve `null` con 200
 * cuando el admin todavía no lo guardó (ver `PerfilService.obtener`); se
 * trata igual que un eventual 404 — formulario vacío para crear por
 * primera vez, no un error.
 */
export function usePerfil() {
  return useQuery({
    queryKey: PERFIL_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<Perfil | null>('/admin/perfil')
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}
