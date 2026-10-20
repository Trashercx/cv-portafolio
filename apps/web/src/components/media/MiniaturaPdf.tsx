import { useEffect, useRef, useState } from 'react'
import { renderizarPrimeraPagina } from '@/features/media/pdf-render'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { IconoDocumento } from './IconoDocumento'

/** Máximo de miniaturas que se conservan en memoria (Fase 7m, #66). */
export const MAX_MINIATURAS_PDF = 50

type EntradaCache = { objectUrl: string; usos: number }

/**
 * Caché en memoria por URL del PDF → object URL de la miniatura. Se desaloja
 * la entrada más antigua que nadie esté mostrando y se libera con
 * `URL.revokeObjectURL`. Las promesas en vuelo se comparten para no renderizar
 * dos veces el mismo PDF.
 */
const cache = new Map<string, EntradaCache>()
const enVuelo = new Map<string, Promise<string>>()
/** URLs que ya fallaron (sin CORS, PDF corrupto…): no se reintentan en cada montaje. */
const fallos = new Set<string>()

function desalojarExcedente() {
  for (const [clave, entrada] of cache) {
    if (cache.size <= MAX_MINIATURAS_PDF) break
    if (entrada.usos > 0) continue
    URL.revokeObjectURL(entrada.objectUrl)
    cache.delete(clave)
  }
}

async function adquirirMiniatura(url: string, ladoMaximo: number): Promise<string> {
  if (fallos.has(url)) throw new Error('La miniatura de este PDF ya falló')
  const existente = cache.get(url)
  if (existente) {
    // Se reinserta para que quede como la más reciente.
    cache.delete(url)
    cache.set(url, existente)
    existente.usos += 1
    return existente.objectUrl
  }
  let promesa = enVuelo.get(url)
  if (!promesa) {
    promesa = renderizarPrimeraPagina(url, { ladoMaximo })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        cache.set(url, { objectUrl, usos: 0 })
        return objectUrl
      })
      .catch((error: unknown) => {
        fallos.add(url)
        throw error
      })
      .finally(() => enVuelo.delete(url))
    enVuelo.set(url, promesa)
  }
  const objectUrl = await promesa
  const entrada = cache.get(url)
  if (entrada) entrada.usos += 1
  desalojarExcedente()
  return objectUrl
}

function liberarMiniatura(url: string) {
  const entrada = cache.get(url)
  if (entrada && entrada.usos > 0) entrada.usos -= 1
  desalojarExcedente()
}

/** Solo para pruebas: vacía la caché y libera sus object URLs. */
export function vaciarCacheMiniaturasPdf() {
  for (const entrada of cache.values()) URL.revokeObjectURL(entrada.objectUrl)
  cache.clear()
  fallos.clear()
  enVuelo.clear()
}

/** Solo para pruebas: cantidad de miniaturas en caché. */
export function tamanoCacheMiniaturasPdf() {
  return cache.size
}

type MiniaturaPdfProps = {
  url: string
  /** Texto alternativo de la miniatura (nombre del documento). */
  alt: string
  /** Tamaño y forma del contenedor; por defecto ocupa todo el espacio disponible. */
  className?: string
  /** Lado mayor del render en píxeles (por defecto 480). */
  ladoMaximo?: number
  /** Clases del círculo del icono de respaldo. */
  claseIcono?: string
  /** Elemento raíz: `span` cuando va dentro de un `<button>` (phrasing content). */
  como?: 'div' | 'span'
}

type Resultado = { url: string; src: string | null }

/**
 * Fase 7m (#66, #68), UC-04/UC-09: miniatura de la primera página de un PDF.
 * Renderiza con pdf.js (chunk lazy) solo cuando el elemento entra en el
 * viewport, así una biblioteca con muchos PDF no los descarga todos. Mientras
 * carga muestra un skeleton y, si el PDF no se puede leer (red, CORS, archivo
 * dañado), el icono de documento: nunca lanza.
 */
export function MiniaturaPdf({
  url,
  alt,
  className,
  ladoMaximo = 480,
  claseIcono,
  como: Raiz = 'div',
}: MiniaturaPdfProps) {
  const contenedor = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  // `src: null` = falló. El resultado lleva la URL para descartar el de un PDF anterior.
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisible(true)
          observador.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let cancelado = false
    let adquirida = false
    adquirirMiniatura(url, ladoMaximo)
      .then((src) => {
        adquirida = true
        if (cancelado) liberarMiniatura(url)
        else setResultado({ url, src })
      })
      .catch(() => {
        if (!cancelado) setResultado({ url, src: null })
      })
    return () => {
      cancelado = true
      if (adquirida) liberarMiniatura(url)
    }
  }, [visible, url, ladoMaximo])

  const actual = resultado?.url === url ? resultado : null

  return (
    <Raiz
      ref={contenedor as React.Ref<HTMLDivElement>}
      data-estado={actual ? (actual.src ? 'listo' : 'error') : 'cargando'}
      className={cn('relative block size-full overflow-hidden bg-muted', className)}
    >
      {actual?.src ? (
        <img src={actual.src} alt={alt} className="size-full object-cover object-top" />
      ) : actual ? (
        <span
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center"
        >
          <IconoDocumento className={claseIcono} />
        </span>
      ) : (
        <Skeleton aria-busy="true" className="size-full rounded-none" />
      )}
    </Raiz>
  )
}
