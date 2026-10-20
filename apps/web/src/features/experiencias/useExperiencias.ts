import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MEDIA_QUERY_KEY } from '@/features/media/useMediaLibrary'
import { TECNOLOGIAS_QUERY_KEY } from '@/features/tecnologias/useTecnologias'
import { apiFetch } from '@/lib/api-client'
import type { Experiencia, ModalidadExperiencia } from './types'

/** Fase 7l, UC-19. Una sola invalidación de `['experiencias']` cubre lista y lienzo del editor. */
export const EXPERIENCIAS_QUERY_KEY = ['experiencias'] as const

/** `GET /admin/experiencias`. También alimenta el lienzo del editor (`useDatosEditor`). */
export function useExperiencias() {
  return useQuery({
    queryKey: EXPERIENCIAS_QUERY_KEY,
    queryFn: () => apiFetch<Experiencia[]>('/admin/experiencias'),
  })
}

/** Cuerpo de `POST/PATCH /admin/experiencias`: sin ids ni fechas de sistema y con `tecnologias` como nombres. */
export type ExperienciaPayload = {
  empresa: string
  cargo: string
  descripcion: string
  fecha_inicio: string
  /** `null` = puesto actual (en `PATCH` borra la fecha de fin existente). */
  fecha_fin: string | null
  ubicacion: string | null
  modalidad: ModalidadExperiencia
  url_empresa: string | null
  logo_media_id: string | null
  tecnologias: string[]
  orden?: number
  visible: boolean
}

function useInvalidarExperiencias() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: EXPERIENCIAS_QUERY_KEY })
    // Las tecnologías nuevas entran al catálogo y el logo cuenta como uso de media.
    queryClient.invalidateQueries({ queryKey: TECNOLOGIAS_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
  }
}

/** `POST /admin/experiencias`. */
export function useCrearExperiencia() {
  const invalidar = useInvalidarExperiencias()
  return useMutation({
    mutationFn: (payload: ExperienciaPayload) =>
      apiFetch<Experiencia>('/admin/experiencias', { method: 'POST', body: payload }),
    meta: {
      mensajeExito: 'Experiencia creada correctamente.',
      mensajeError: 'No se pudo crear la experiencia. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `PATCH /admin/experiencias/:id`. Sirve también para ocultar/mostrar (`{ visible }`). */
export function useActualizarExperiencia() {
  const invalidar = useInvalidarExperiencias()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ExperienciaPayload> }) =>
      apiFetch<Experiencia>(`/admin/experiencias/${id}`, { method: 'PATCH', body: payload }),
    meta: {
      mensajeExito: 'Experiencia guardada correctamente.',
      mensajeError: 'No se pudo guardar la experiencia. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `DELETE /admin/experiencias/:id`. */
export function useEliminarExperiencia() {
  const invalidar = useInvalidarExperiencias()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/admin/experiencias/${id}`, { method: 'DELETE' }),
    meta: {
      mensajeExito: 'Experiencia eliminada correctamente.',
      mensajeError: 'No se pudo eliminar la experiencia. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}

/** `PATCH /admin/experiencias/reordenar` con un array plano `[{ id, orden }]` (como logros); responde `{ actualizados }`. */
export function useReordenarExperiencias() {
  const invalidar = useInvalidarExperiencias()
  return useMutation({
    mutationFn: (items: Array<{ id: string; orden: number }>) =>
      apiFetch<{ actualizados: number }>('/admin/experiencias/reordenar', {
        method: 'PATCH',
        body: items,
      }),
    meta: {
      mensajeError: 'No se pudo reordenar las experiencias. Intenta de nuevo.',
    },
    onSuccess: invalidar,
  })
}
