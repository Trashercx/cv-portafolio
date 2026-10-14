import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { PeriodoMetricas, RespuestaMetricas } from './types'

export const METRICAS_QUERY_KEY = ['metricas'] as const

/**
 * `GET /admin/metricas?periodo=` (Fase 8, 8.4; UC-27). El API cachea 60 s por
 * periodo, así que el `staleTime` va alineado para no repetir peticiones.
 */
export function useMetricas(periodo: PeriodoMetricas) {
  return useQuery({
    queryKey: [...METRICAS_QUERY_KEY, periodo] as const,
    queryFn: () => apiFetch<RespuestaMetricas>(`/admin/metricas?periodo=${periodo}`),
    staleTime: 60_000,
  })
}
