import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { Proyecto } from './types'

export const PROYECTOS_QUERY_KEY = ['proyectos'] as const
export const proyectoQueryKey = (id: string) => ['proyectos', id] as const

/** `GET /admin/proyectos`: lista completa (con tecnologías/imágenes), respeta `orden`. */
export function useProyectos() {
  return useQuery({
    queryKey: PROYECTOS_QUERY_KEY,
    queryFn: () => apiFetch<Proyecto[]>('/admin/proyectos'),
  })
}

/** `GET /admin/proyectos/:id`: detalle con tecnologías/imágenes. */
export function useProyecto(id: string | undefined) {
  return useQuery({
    queryKey: proyectoQueryKey(id ?? ''),
    queryFn: () => apiFetch<Proyecto>(`/admin/proyectos/${id}`),
    enabled: Boolean(id),
  })
}
