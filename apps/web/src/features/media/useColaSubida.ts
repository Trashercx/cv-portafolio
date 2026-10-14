import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api-client'
import type { Media } from './types'
import { MEDIA_QUERY_KEY } from './useMediaLibrary'
import { subirMedia } from './useUploadMedia'

export type EstadoSubida =
  | 'pendiente'
  | 'subiendo'
  | 'listo'
  | 'error'
  | 'cancelado'

export type ItemCola = {
  id: string
  file: File
  estado: EstadoSubida
  /** 0–100. */
  progreso: number
  error?: string
  media?: Media
  /** Fase 7e (UC-09): carpeta destino fijada al encolar; `undefined` = sin carpeta. */
  carpeta_id?: string
}

/** Límite del API por archivo (10 MB). */
export const MAX_BYTES_SUBIDA = 10 * 1024 * 1024
const TIPO_PERMITIDO = /^(image\/|application\/pdf$)/

/** Valida en cliente lo mismo que el API para no gastar una subida segura de fallar. */
function validarArchivo(file: File): string | undefined {
  if (!TIPO_PERMITIDO.test(file.type)) return 'Solo se admiten imágenes y PDF.'
  if (file.size > MAX_BYTES_SUBIDA) return 'El archivo supera los 10 MB.'
  return undefined
}

let contador = 0

/**
 * Cola de subidas de la biblioteca (Fase 7d, UC-09): hasta `concurrencia`
 * (3) archivos en paralelo, progreso por archivo, cancelación, reintento y
 * limpieza. Al terminar cada archivo invalida `['media']`, raíz que cubre la
 * lista y `['media','usos']`.
 */
export function useColaSubida(concurrencia = 3) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ItemCola[]>([])
  const iniciados = useRef(new Set<string>())
  const controladores = useRef(new Map<string, AbortController>())

  // Revisión Fase 7d: al desmontar la página se abortan las subidas en vuelo
  // para no dejar peticiones huérfanas ni actualizaciones de estado tardías.
  useEffect(() => {
    const activos = controladores.current
    return () => {
      activos.forEach((controlador) => controlador.abort())
      activos.clear()
    }
  }, [])

  const actualizar = useCallback((id: string, cambios: Partial<ItemCola>) => {
    setItems((actuales) =>
      actuales.map((item) => (item.id === id ? { ...item, ...cambios } : item)),
    )
  }, [])

  const agregar = useCallback((archivos: File[], carpeta_id?: string) => {
    const nuevos: ItemCola[] = archivos.map((file) => {
      const error = validarArchivo(file)
      return {
        id: `subida-${++contador}`,
        file,
        estado: error ? 'error' : 'pendiente',
        progreso: 0,
        error,
        carpeta_id,
      }
    })
    if (nuevos.length > 0) setItems((actuales) => [...actuales, ...nuevos])
  }, [])

  // Bomba de la cola: arranca pendientes mientras haya cupo.
  useEffect(() => {
    let libres = concurrencia - items.filter((i) => i.estado === 'subiendo').length
    for (const item of items) {
      if (libres <= 0) break
      if (item.estado !== 'pendiente' || iniciados.current.has(item.id)) continue
      libres--
      iniciados.current.add(item.id)
      const controlador = new AbortController()
      controladores.current.set(item.id, controlador)
      actualizar(item.id, { estado: 'subiendo', progreso: 0, error: undefined })

      subirMedia(
        { file: item.file, carpeta_id: item.carpeta_id },
        {
          signal: controlador.signal,
          onProgress: (progreso) => actualizar(item.id, { progreso }),
        },
      )
        .then((media) => actualizar(item.id, { estado: 'listo', progreso: 100, media }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            actualizar(item.id, { estado: 'cancelado' })
          } else {
            actualizar(item.id, {
              estado: 'error',
              error:
                error instanceof ApiError ? error.message : 'No se pudo subir el archivo.',
            })
          }
        })
        .finally(() => {
          controladores.current.delete(item.id)
          queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
        })
    }
  }, [items, concurrencia, actualizar, queryClient])

  const cancelar = useCallback((id: string) => {
    const controlador = controladores.current.get(id)
    if (controlador) {
      controlador.abort()
      return
    }
    setItems((actuales) =>
      actuales.map((item) =>
        item.id === id && item.estado === 'pendiente'
          ? { ...item, estado: 'cancelado' }
          : item,
      ),
    )
  }, [])

  const reintentar = useCallback((id: string) => {
    iniciados.current.delete(id)
    setItems((actuales) =>
      actuales.map((item) =>
        item.id === id && (item.estado === 'error' || item.estado === 'cancelado')
          ? { ...item, estado: 'pendiente', progreso: 0, error: undefined }
          : item,
      ),
    )
  }, [])

  /** Quita de la cola los terminados (`listo`, `error`, `cancelado`). */
  const limpiar = useCallback(() => {
    setItems((actuales) =>
      actuales.filter((i) => i.estado === 'pendiente' || i.estado === 'subiendo'),
    )
  }, [])

  return { items, agregar, cancelar, reintentar, limpiar }
}
