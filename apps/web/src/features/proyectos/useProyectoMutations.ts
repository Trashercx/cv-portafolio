import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { ItemConOrdenYId, ItemConOrdenYMediaId } from '@/lib/reorder'
import { PROYECTOS_QUERY_KEY, proyectoQueryKey } from './useProyectos'
import type { ProyectoBase } from './types'

export type ProyectoPayload = {
  titulo: string
  descripcion: string
  url_demo?: string
  url_repositorio?: string
  fecha_inicio: string
  fecha_fin?: string
  estado: string
  destacado: boolean
  orden: number
}

/** `POST /admin/proyectos`. */
export function useCrearProyecto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProyectoPayload) =>
      apiFetch<ProyectoBase>('/admin/proyectos', {
        method: 'POST',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Proyecto creado correctamente.',
      mensajeError: 'No se pudo crear el proyecto. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/proyectos/:id`. */
export function useActualizarProyecto(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<ProyectoPayload>) =>
      apiFetch<ProyectoBase>(`/admin/proyectos/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Proyecto guardado correctamente.',
      mensajeError: 'No se pudo guardar el proyecto. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: proyectoQueryKey(id) })
    },
  })
}

/** `DELETE /admin/proyectos/:id`. */
export function useEliminarProyecto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ eliminado: boolean }>(`/admin/proyectos/${id}`, {
        method: 'DELETE',
      }),
    meta: {
      mensajeExito: 'Proyecto eliminado correctamente.',
      mensajeError: 'No se pudo eliminar el proyecto. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/proyectos/reordenar` (bulk, en una sola transacción). */
export function useReordenarProyectos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: ItemConOrdenYId[]) =>
      apiFetch<{ actualizados: number }>('/admin/proyectos/reordenar', {
        method: 'PATCH',
        body: items,
      }),
    meta: {
      mensajeError: 'No se pudo reordenar los proyectos. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `POST /admin/proyectos/:id/tecnologias/:tecnologiaId`. */
export function useAgregarTecnologiaProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tecnologiaId: string) =>
      apiFetch(`/admin/proyectos/${proyectoId}/tecnologias/${tecnologiaId}`, {
        method: 'POST',
      }),
    meta: {
      mensajeError: 'No se pudo agregar la tecnología. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proyectoQueryKey(proyectoId) })
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `DELETE /admin/proyectos/:id/tecnologias/:tecnologiaId`. */
export function useQuitarTecnologiaProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tecnologiaId: string) =>
      apiFetch(`/admin/proyectos/${proyectoId}/tecnologias/${tecnologiaId}`, {
        method: 'DELETE',
      }),
    meta: {
      mensajeError: 'No se pudo quitar la tecnología. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proyectoQueryKey(proyectoId) })
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

export type AsociarImagenPayload = { media_id: string; orden: number }

/** `POST /admin/proyectos/:id/imagenes`. */
export function useAgregarImagenProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AsociarImagenPayload) =>
      apiFetch(`/admin/proyectos/${proyectoId}/imagenes`, {
        method: 'POST',
        body: payload,
      }),
    meta: {
      mensajeExito: 'Imagen agregada a la galería.',
      mensajeError: 'No se pudo agregar la imagen. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proyectoQueryKey(proyectoId) })
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `DELETE /admin/proyectos/:id/imagenes/:mediaId`. */
export function useQuitarImagenProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mediaId: string) =>
      apiFetch(`/admin/proyectos/${proyectoId}/imagenes/${mediaId}`, {
        method: 'DELETE',
      }),
    meta: {
      mensajeExito: 'Imagen quitada de la galería.',
      mensajeError: 'No se pudo quitar la imagen. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proyectoQueryKey(proyectoId) })
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}

/** `PATCH /admin/proyectos/:id/imagenes/reordenar` (bulk). */
export function useReordenarImagenesProyecto(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: ItemConOrdenYMediaId[]) =>
      apiFetch(`/admin/proyectos/${proyectoId}/imagenes/reordenar`, {
        method: 'PATCH',
        body: items,
      }),
    meta: {
      mensajeError: 'No se pudo reordenar las imágenes. Intenta de nuevo.',
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proyectoQueryKey(proyectoId) })
      queryClient.invalidateQueries({ queryKey: PROYECTOS_QUERY_KEY })
    },
  })
}
