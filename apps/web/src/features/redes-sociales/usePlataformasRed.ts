import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { PlataformaRed } from './types'

export const PLATAFORMAS_RED_QUERY_KEY = ['plataformas-red'] as const

/** `GET /admin/plataformas-red`: catálogo sembrado, solo lectura. */
export function usePlataformasRed() {
  return useQuery({
    queryKey: PLATAFORMAS_RED_QUERY_KEY,
    queryFn: () => apiFetch<PlataformaRed[]>('/admin/plataformas-red'),
  })
}
