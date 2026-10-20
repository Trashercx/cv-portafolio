import { useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Search, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ACCEPT_IMAGENES } from '@/features/media/formatos-imagen'
import { prepararArchivoParaSubir } from '@/features/media/heic-a-jpeg'
import type { Media } from '@/features/media/types'
import { useCarpetasMedia } from '@/features/media/useCarpetasMedia'
import { MEDIA_QUERY_KEY, useMediaList } from '@/features/media/useMediaLibrary'
import { subirMedia } from '@/features/media/useUploadMedia'
import { nombreArchivo } from '@/features/media/utilidades-media'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { ImagenResponsive } from '@/components/publico/ImagenResponsive'
import { MiniaturaPdf } from './MiniaturaPdf'

/** Miniaturas de la grilla: como mucho ~12 rem, así el navegador elige la variante de 640 px. */
const SIZES_MINIATURA = '(min-width: 768px) 12rem, 45vw'

export type TipoMediaElegible = 'imagen' | 'pdf'

type BibliotecaMediaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSeleccionar: (media: Media) => void
  /** Tipos de `Media` que se pueden elegir (por defecto solo imágenes). */
  tiposPermitidos?: TipoMediaElegible[]
  /** Id elegido ahora: se resalta en la grilla. */
  seleccionadoId?: string | null
  titulo?: string
  descripcion?: string
  /** Botón "Subir imagen" dentro del diálogo (solo con imágenes). Por defecto sí. */
  permitirSubir?: boolean
}

/**
 * Diálogo de la biblioteca de medios con miniaturas (UC-09). Fase 7k: lo
 * comparten los formularios del panel (`MediaField`) y los campos de imagen
 * del editor visual (Puck), que antes eran un `<select>` de texto. Busca por
 * nombre o texto alternativo, filtra por carpeta, muestra el nombre legible
 * de cada archivo, resalta el elegido y, si solo admite imágenes, permite
 * subir una nueva sin salir del editor (queda elegida al terminar).
 */
export function BibliotecaMediaDialog({
  open,
  onOpenChange,
  onSeleccionar,
  tiposPermitidos = ['imagen'],
  seleccionadoId,
  titulo = 'Elegir de la biblioteca',
  descripcion = 'Haz clic en una imagen para usarla.',
  permitirSubir = true,
}: BibliotecaMediaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-3 overflow-y-auto scrollbar-fina sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {/* Solo se monta (y consulta la biblioteca) con el diálogo abierto. */}
        <GrillaBibliotecaMedia
          tiposPermitidos={tiposPermitidos}
          seleccionadoId={seleccionadoId}
          permitirSubir={permitirSubir}
          onSeleccionar={(media) => {
            onSeleccionar(media)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function useValorDiferido(valor: string, ms = 300): string {
  const [diferido, setDiferido] = useState(valor)
  useEffect(() => {
    const t = window.setTimeout(() => setDiferido(valor), ms)
    return () => window.clearTimeout(t)
  }, [valor, ms])
  return diferido
}

function GrillaBibliotecaMedia({
  tiposPermitidos,
  seleccionadoId,
  permitirSubir,
  onSeleccionar,
}: {
  tiposPermitidos: TipoMediaElegible[]
  seleccionadoId?: string | null
  permitirSubir: boolean
  onSeleccionar: (media: Media) => void
}) {
  // Con un solo tipo se filtra en el servidor (`GET /admin/media?tipo=` acepta
  // uno); con varios se trae todo y se filtra aquí.
  const tipoFiltroServidor = tiposPermitidos.length === 1 ? tiposPermitidos[0] : undefined
  const [carpeta, setCarpeta] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const q = useValorDiferido(busqueda.trim())
  const { data: carpetas = [] } = useCarpetasMedia()
  // Sin carpeta ni búsqueda se pasa el argumento histórico (solo `tipo`):
  // comparte caché con los demás selectores.
  const { data: media, isLoading } = useMediaList(
    carpeta === 'todas' && !q
      ? tipoFiltroServidor
      : {
          tipo: tipoFiltroServidor,
          ...(carpeta !== 'todas' ? { carpeta_id: carpeta } : {}),
          ...(q ? { q } : {}),
        },
  )
  const disponibles = (media ?? []).filter((item) =>
    tiposPermitidos.includes(item.tipo as TipoMediaElegible),
  )
  const soloImagenes =
    permitirSubir && tiposPermitidos.length === 1 && tiposPermitidos[0] === 'imagen'
  const [errorSubida, setErrorSubida] = useState<string | null>(null)

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar en la biblioteca"
            className="pl-8"
          />
        </div>
        <Select value={carpeta} onValueChange={setCarpeta}>
          <SelectTrigger className="w-full" aria-label="Filtrar por carpeta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las carpetas</SelectItem>
            <SelectItem value="ninguna">Sin carpeta</SelectItem>
            {carpetas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {soloImagenes ? (
          <SubirDesdeDialogo
            carpetaId={carpeta !== 'todas' && carpeta !== 'ninguna' ? carpeta : undefined}
            onSubida={onSeleccionar}
            onError={setErrorSubida}
          />
        ) : null}
      </div>
      {errorSubida ? (
        <p role="alert" className="text-sm text-destructive">
          {errorSubida}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando archivos…</p>
      ) : disponibles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {q
            ? 'Ningún archivo coincide con la búsqueda.'
            : carpeta === 'todas'
              ? soloImagenes
                ? 'Todavía no hay imágenes en la biblioteca. Sube una con "Subir imagen".'
                : 'Todavía no hay archivos de este tipo en la biblioteca. Sube uno desde la pestaña "Subir nuevo".'
              : 'No hay archivos de este tipo en esa carpeta.'}
        </p>
      ) : (
        <ul
          aria-label="Archivos de la biblioteca"
          className="grid max-h-[55dvh] grid-cols-2 gap-3 overflow-y-auto p-1 scrollbar-fina sm:grid-cols-3 md:grid-cols-4"
        >
          {disponibles.map((item) => {
            const elegido = item.id === seleccionadoId
            const nombre = nombreArchivo(item)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={elegido}
                  title={nombre}
                  onClick={() => onSeleccionar(item)}
                  className={cn(
                    'group relative grid w-full gap-1.5 rounded-lg border bg-card p-1.5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring',
                    elegido && 'border-primary ring-2 ring-primary',
                  )}
                >
                  {item.tipo === 'imagen' ? (
                    <ImagenResponsive
                      media={item}
                      alt={item.alt_text ?? ''}
                      sizes={SIZES_MINIATURA}
                      className="aspect-square w-full rounded-md bg-muted object-cover"
                    />
                  ) : (
                    // Fase 7m (#66, #68): miniatura de la primera página del PDF.
                    <MiniaturaPdf
                      url={item.url}
                      alt={item.alt_text || nombre}
                      className="aspect-square rounded-md"
                    />
                  )}
                  <span className="truncate px-0.5 text-xs text-muted-foreground">{nombre}</span>
                  {elegido ? (
                    <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="size-4" aria-hidden="true" />
                      <span className="sr-only">Elegida</span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Sube una imagen a la biblioteca desde el diálogo y la deja elegida. Si el
 * diálogo se cierra con la subida en vuelo, la imagen queda en la biblioteca
 * pero NO se elige (el campo no cambia por sorpresa).
 */
function SubirDesdeDialogo({
  carpetaId,
  onSubida,
  onError,
}: {
  carpetaId?: string
  onSubida: (media: Media) => void
  onError: (mensaje: string | null) => void
}) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const montado = useRef(true)
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  const [subiendo, setSubiendo] = useState(false)
  const setError = (mensaje: string | null) => {
    if (montado.current) onError(mensaje)
  }

  async function alElegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return
    setError(null)
    setSubiendo(true)
    try {
      // Formatos de móvil (HEIC) se preparan como en la biblioteca (Fase 7g).
      const preparado = await prepararArchivoParaSubir(archivo)
      if ('error' in preparado) {
        setError(preparado.error)
        return
      }
      const media = await subirMedia({ file: preparado.file, tipo: 'imagen', carpeta_id: carpetaId })
      await queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY })
      if (montado.current) onSubida(media)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo subir la imagen.')
    } finally {
      if (montado.current) setSubiendo(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_IMAGENES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={alElegir}
      />
      <Button
        type="button"
        variant="outline"
        disabled={subiendo}
        onClick={() => inputRef.current?.click()}
      >
        {subiendo ? <Loader2 className="animate-spin" /> : <Upload />}
        {subiendo ? 'Subiendo…' : 'Subir imagen'}
      </Button>
    </>
  )
}
