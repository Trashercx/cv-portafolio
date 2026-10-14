import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { InfoProveedorInsignia } from './types'

/** Fase 7e, UC-35: la lista de proveedores solo cambia con un despliegue, no se vuelve a pedir. */
export const PROVEEDORES_INSIGNIA_QUERY_KEY = ['insignias', 'proveedores'] as const

/** `GET /admin/insignias/proveedores`: alimenta "Proveedores reconocidos" del diálogo de importación. */
export function useProveedoresInsignia() {
  return useQuery({
    queryKey: PROVEEDORES_INSIGNIA_QUERY_KEY,
    queryFn: () => apiFetch<InfoProveedorInsignia[]>('/admin/insignias/proveedores'),
    staleTime: Infinity,
  })
}
