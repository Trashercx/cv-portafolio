import { useMutation } from '@tanstack/react-query'
import { apiUpload } from '@/lib/api-client'
import type { Media } from './types'

export type UploadMediaPayload = {
  file: File
  altText?: string
  tipo?: string
}

/**
 * `POST /admin/media`, multipart/form-data. Usado por `MediaUploadField`
 * (perfil, certificaciones, galería de proyectos). No invalida ninguna
 * query de lista: la biblioteca de media completa (UC-09) llega en
 * Sprint 3; por ahora cada formulario que use este hook se encarga de
 * asociar el `media_id` devuelto a su propia entidad.
 */
export function useUploadMedia() {
  return useMutation({
    mutationFn: ({ file, altText, tipo }: UploadMediaPayload) => {
      const formData = new FormData()
      formData.append('file', file)
      if (altText) formData.append('alt_text', altText)
      if (tipo) formData.append('tipo', tipo)

      return apiUpload<Media>('/admin/media', formData)
    },
  })
}
