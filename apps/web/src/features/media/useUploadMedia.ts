import { useMutation } from '@tanstack/react-query'
import { API_BASE_URL, ApiError } from '@/lib/api-client'
import type { Media } from './types'

export type UploadMediaPayload = {
  file: File
  altText?: string
  tipo?: string
  carpeta?: string
  /** Fase 7e (UC-09): carpeta de la biblioteca donde cae el archivo; omitido = sin carpeta. */
  carpeta_id?: string
}

export type OpcionesSubida = {
  /** Progreso 0–100 de los bytes enviados (`xhr.upload.onprogress`). */
  onProgress?: (porcentaje: number) => void
  /** Al abortar la señal se cancela la petición y la promesa rechaza con `AbortError`. */
  signal?: AbortSignal
}

/**
 * `POST /admin/media` con `XMLHttpRequest` (Fase 7d, UC-09): `fetch` no expone
 * el progreso de subida. Replica `apiUpload`: misma base `VITE_API_URL`,
 * `withCredentials` (cookie httpOnly) y sin `Content-Type` manual (el
 * navegador pone el boundary del multipart).
 */
export function subirMedia(
  { file, altText, tipo, carpeta, carpeta_id }: UploadMediaPayload,
  { onProgress, signal }: OpcionesSubida = {},
): Promise<Media> {
  return new Promise<Media>((resolve, reject) => {
    const path = '/admin/media'
    const abortado = () => new DOMException('Subida cancelada', 'AbortError')

    if (signal?.aborted) {
      reject(abortado())
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (altText) formData.append('alt_text', altText)
    if (tipo) formData.append('tipo', tipo)
    if (carpeta) formData.append('carpeta', carpeta)
    if (carpeta_id) formData.append('carpeta_id', carpeta_id)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)
    xhr.withCredentials = true

    const alAbortar = () => xhr.abort()
    const limpiar = () => signal?.removeEventListener('abort', alAbortar)

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && evento.total > 0) {
        onProgress?.(Math.round((evento.loaded / evento.total) * 100))
      }
    }

    xhr.onload = () => {
      limpiar()
      let datos: unknown
      try {
        datos = xhr.responseText ? JSON.parse(xhr.responseText) : undefined
      } catch {
        datos = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(datos as Media)
        return
      }
      const mensaje =
        datos && typeof datos === 'object' && 'message' in datos
          ? String((datos as { message: unknown }).message)
          : 'Ocurrió un error inesperado. Intenta de nuevo.'
      reject(new ApiError(mensaje, xhr.status, path))
    }

    xhr.onerror = () => {
      limpiar()
      reject(new ApiError('No se pudo conectar con el servidor.', 0, path))
    }

    xhr.onabort = () => {
      limpiar()
      reject(abortado())
    }

    signal?.addEventListener('abort', alAbortar)
    xhr.send(formData)
  })
}

/**
 * Subida unitaria como mutación (usada por `MediaUploadField`, formularios de
 * perfil/certificaciones/proyectos). Desde la Fase 7d usa `subirMedia` (XHR);
 * la cola de la biblioteca usa `useColaSubida`. No invalida listas: cada
 * formulario asocia el `media_id` devuelto a su entidad.
 */
export function useUploadMedia() {
  return useMutation({
    mutationFn: (payload: UploadMediaPayload) => subirMedia(payload),
    meta: {
      mensajeExito: 'Archivo subido correctamente.',
    },
  })
}
