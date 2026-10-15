import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api-client'
import type { Media } from './types'
import { MEDIA_QUERY_KEY } from './useMediaLibrary'
import { subirMedia } from './useUploadMedia'
import { prepararArchivoParaSubir } from './heic-a-jpeg'
import { MAX_BYTES_SUBIDA } from './limites-lienzo'

export { MAX_BYTES_SUBIDA }

export type EstadoSubida =
  | 'convirtiendo'
  | 'pendiente'
  | 'subiendo'
  | 'listo'
  | 'error'
  | 'cancelado'

export type ItemCola = {
  id: string
  /** Fase 7h: nombre tal como lo eligió el usuario (no el del JPEG convertido). */
  nombre: string
  file: File
  estado: EstadoSubida
  /** 0–100. */
  progreso: number
  error?: string
  media?: Media
  /** Fase 7e (UC-09): carpeta destino fijada al encolar; `undefined` = sin carpeta. */
  carpeta_id?: string
  /** Fase 7g: `true` cuando `file` ya pasó por `prepararArchivoParaSubir` (un reintento no repite la conversión). */
  normalizado: boolean
}

let contador = 0

/**
 * Fase 7h (UC-09): los archivos subidos salen solos de la cola tras este
 * retardo, sin botón "Limpiar"; los que fallan o se cancelan se quedan para
 * reintentar o descartar.
 */
export const RETARDO_AUTOLIMPIEZA_MS = 1500

const esAutolimpiable = (estado: EstadoSubida) => estado === 'listo'

/**
 * Cola de subidas de la biblioteca (Fase 7d, UC-09): hasta `concurrencia`
 * (3) archivos en paralelo, progreso por archivo, cancelación, reintento y
 * limpieza (automática para los subidos desde la Fase 7h). Al terminar cada
 * archivo invalida `['media']`, raíz que cubre la lista y `['media','usos']`.
 */
export function useColaSubida(concurrencia = 3) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<ItemCola[]>([])
  const iniciados = useRef(new Set<string>())
  const controladores = useRef(new Map<string, AbortController>())
  const itemsRef = useRef<ItemCola[]>([])
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  // Fase 7h: autolimpieza. Un temporizador por item terminado; si el item
  // vuelve a la cola (reintento) antes de que venza, se anula.
  const temporizadores = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const mapa = temporizadores.current
    for (const item of items) {
      if (esAutolimpiable(item.estado)) {
        if (mapa.has(item.id)) continue
        mapa.set(
          item.id,
          setTimeout(() => {
            mapa.delete(item.id)
            iniciados.current.delete(item.id)
            controladores.current.delete(item.id)
            setItems((actuales) =>
              actuales.filter((i) => !(i.id === item.id && esAutolimpiable(i.estado))),
            )
          }, RETARDO_AUTOLIMPIEZA_MS),
        )
      } else if (mapa.has(item.id)) {
        clearTimeout(mapa.get(item.id))
        mapa.delete(item.id)
      }
    }
  }, [items])
  useEffect(() => {
    const mapa = temporizadores.current
    return () => {
      mapa.forEach((temporizador) => clearTimeout(temporizador))
      mapa.clear()
    }
  }, [])

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

  // Fase 7g (UC-09): cada archivo entra como `convirtiendo` mientras se detecta su
  // formato y, si es HEIC, se convierte a JPEG en el navegador; luego pasa a
  // `pendiente` (con el `File` convertido) o a `error` con el motivo. El resultado
  // solo se aplica si el item sigue en `convirtiendo` (si se canceló o se limpió
  // mientras tanto, se descarta).
  const prepararItem = useCallback(async (id: string, file: File) => {
    const resultado = await prepararArchivoParaSubir(file)
    setItems((actuales) =>
      actuales.map((item) => {
        if (item.id !== id || item.estado !== 'convirtiendo') return item
        return 'error' in resultado
          ? { ...item, estado: 'error', error: resultado.error }
          : { ...item, file: resultado.file, normalizado: true, estado: 'pendiente', error: undefined }
      }),
    )
  }, [])

  const agregar = useCallback(
    (archivos: File[], carpeta_id?: string) => {
      if (archivos.length === 0) return
      const nuevos: ItemCola[] = archivos.map((file) => ({
        id: `subida-${++contador}`,
        nombre: file.name,
        file,
        estado: 'convirtiendo',
        progreso: 0,
        carpeta_id,
        normalizado: false,
      }))
      setItems((actuales) => [...actuales, ...nuevos])
      for (const item of nuevos) void prepararItem(item.id, item.file)
    },
    [prepararItem],
  )

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
        item.id === id && (item.estado === 'pendiente' || item.estado === 'convirtiendo')
          ? { ...item, estado: 'cancelado' }
          : item,
      ),
    )
  }, [])

  const reintentar = useCallback(
    (id: string) => {
      const actual = itemsRef.current.find((i) => i.id === id)
      if (!actual || (actual.estado !== 'error' && actual.estado !== 'cancelado')) return
      iniciados.current.delete(id)
      if (!actual.normalizado) {
        // El fallo vino de la preparación (formato, tamaño o conversión HEIC): se repite
        // desde el archivo original, nunca se sube sin convertir.
        setItems((actuales) =>
          actuales.map((item) =>
            item.id === id ? { ...item, estado: 'convirtiendo', progreso: 0, error: undefined } : item,
          ),
        )
        void prepararItem(id, actual.file)
        return
      }
      setItems((actuales) =>
        actuales.map((item) =>
          item.id === id ? { ...item, estado: 'pendiente', progreso: 0, error: undefined } : item,
        ),
      )
    },
    [prepararItem],
  )

  /** Fase 7h: quita un item (lo usa "Descartar" en los que fallaron). */
  const descartar = useCallback((id: string) => {
    setItems((actuales) =>
      actuales.filter((i) => !(i.id === id && (i.estado === 'error' || i.estado === 'cancelado'))),
    )
  }, [])

  /** Quita de la cola los terminados (`listo`, `error`, `cancelado`). */
  const limpiar = useCallback(() => {
    setItems((actuales) =>
      actuales.filter(
        (i) => i.estado === 'convirtiendo' || i.estado === 'pendiente' || i.estado === 'subiendo',
      ),
    )
  }, [])

  return { items, agregar, cancelar, reintentar, descartar, limpiar }
}
