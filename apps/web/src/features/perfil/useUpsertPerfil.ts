import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { PERFIL_QUERY_KEY } from './usePerfil'
import type { Perfil } from './types'

export type UpsertPerfilPayload = {
  nombre_completo: string
  titulo_profesional: string
  resumen_bio: string
  imagen_perfil_id?: string
  cv_media_id?: string
  ubicacion: string
}

/** `PUT /admin/perfil` (upsert real, fila única). */
export function useUpsertPerfil() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertPerfilPayload) =>
      apiFetch<Perfil>('/admin/perfil', { method: 'PUT', body: payload }),
    onSuccess: (perfil) => {
      queryClient.setQueryData(PERFIL_QUERY_KEY, perfil)
    },
  })
}
