import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { Tecnologia } from './types'

export const TECNOLOGIAS_QUERY_KEY = ['tecnologias'] as const

/** `GET /admin/tecnologias`: catálogo completo (soporte del selector multi-tecnología de UC-03). */
export function useTecnologias() {
  return useQuery({
    queryKey: TECNOLOGIAS_QUERY_KEY,
    queryFn: () => apiFetch<Tecnologia[]>('/admin/tecnologias'),
  })
}

/** `POST /admin/tecnologias`: crea o reutiliza (el backend deduplica por `nombre`). */
export function useCrearTecnologia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (nombre: string) =>
      apiFetch<Tecnologia>('/admin/tecnologias', {
        method: 'POST',
        body: { nombre },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNOLOGIAS_QUERY_KEY })
    },
  })
}
