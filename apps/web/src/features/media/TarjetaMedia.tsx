import { Copy, Pencil } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { IconoDocumento } from '@/components/media/IconoDocumento'
import { ImagenResponsive } from '@/components/publico/ImagenResponsive'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { MIME_IDS_MEDIA } from './BarraCarpetas'
import type { Media, UsoMedia } from './types'
import { useActualizarMedia } from './useMediaLibrary'
import { nombreArchivo, textoUso } from './utilidades-media'

export type VistaBiblioteca = 'cuadricula' | 'lista'

function textoVariantes(media: Media): string | null {
  if (media.tipo !== 'imagen') return null
  const n = media.variantes?.length ?? 0
  if (n === 0) return 'sin variantes'
  return n === 1 ? '1 variante' : `${n} variantes`
}

type EdicionAltProps = { media: Media }

/**
 * Edición en línea del texto alternativo (Fase 7d, UC-09): lápiz → input;
 * Enter o blur guardan (solo si cambió), Esc cancela.
 */
function EdicionAlt({ media }: EdicionAltProps) {
  const actualizar = useActualizarMedia()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  // Esc cancela y luego dispara `blur` al desmontar el input: sin esta marca se guardaría.
  const cancelado = useRef(false)

  const nombre = nombreArchivo(media)

  const empezar = () => {
    cancelado.current = false
    setValor(media.alt_text ?? '')
    setEditando(true)
  }

  const guardar = () => {
    if (cancelado.current) return
    setEditando(false)
    if (valor !== (media.alt_text ?? '')) {
      actualizar.mutate({ id: media.id, alt_text: valor })
    }
  }

  if (editando) {
    return (
      <Input
        autoFocus
        value={valor}
        aria-label={`Texto alternativo de ${nombre}`}
        className="h-7 text-xs"
        onChange={(event) => setValor(event.target.value)}
        onBlur={guardar}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            guardar()
          } else if (event.key === 'Escape') {
            event.stopPropagation()
            cancelado.current = true
            setEditando(false)
          }
        }}
      />
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <p className="truncate text-xs text-muted-foreground">
        {media.alt_text || '(sin texto alternativo)'}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        aria-label={`Editar texto alternativo de ${nombre}`}
        onClick={empezar}
      >
        <Pencil className="size-3" />
      </Button>
    </div>
  )
}

type TarjetaMediaProps = {
  media: Media
  vista: VistaBiblioteca
  usos: UsoMedia[]
  modoSeleccion: boolean
  seleccionado: boolean
  onAlternar: (id: string) => void
  onAbrir: (id: string) => void
  /** Fase 7e (UC-09): nombre de la carpeta, visible en la vista lista. */
  nombreCarpeta?: string
  /**
   * Fase 7e (UC-09): ids que viajan al arrastrar esta tarjeta (la tarjeta sola,
   * o toda la selección si forma parte de ella). Sin esta prop no es arrastrable.
   */
  idsAlArrastrar?: (id: string) => string[]
}

/** Tarjeta (cuadrícula) o fila (lista) de un archivo de la biblioteca (Fase 7d, UC-09). */
export function TarjetaMedia({
  media,
  vista,
  usos,
  modoSeleccion,
  seleccionado,
  onAlternar,
  onAbrir,
  nombreCarpeta,
  idsAlArrastrar,
}: TarjetaMediaProps) {
  const nombre = nombreArchivo(media)
  const variantes = textoVariantes(media)
  const enLista = vista === 'lista'

  // Fase 7e (UC-09): arrastre HTML5 nativo hacia una carpeta de la barra.
  const propsArrastre = idsAlArrastrar
    ? {
        draggable: true,
        onDragStart: (evento: DragEvent) => {
          evento.dataTransfer.setData(MIME_IDS_MEDIA, JSON.stringify(idsAlArrastrar(media.id)))
          evento.dataTransfer.effectAllowed = 'move'
        },
      }
    : {}

  const copiarUrl = async () => {
    try {
      await navigator.clipboard.writeText(media.url)
      toast.success('URL copiada al portapapeles.')
    } catch {
      toast.error('No se pudo copiar la URL.')
    }
  }

  const miniatura = (
    <button
      type="button"
      aria-label={
        modoSeleccion ? `Alternar selección de ${nombre}` : `Abrir detalle de ${nombre}`
      }
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-muted',
        enLista ? 'size-14 rounded-md' : 'aspect-square w-full',
      )}
      onClick={() => (modoSeleccion ? onAlternar(media.id) : onAbrir(media.id))}
    >
      {media.tipo === 'imagen' ? (
        <ImagenResponsive
          media={media}
          alt={media.alt_text ?? ''}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="size-full object-cover"
        />
      ) : (
        <IconoDocumento />
      )}
    </button>
  )

  const distintivo =
    usos.length > 0 ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" tabIndex={0}>
            En uso ({usos.length})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="grid gap-0.5">
            {usos.map((uso) => (
              <li key={`${uso.tipo}-${uso.id}`}>{textoUso(uso)}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    ) : null

  const datos = (
    <div className="grid min-w-0 gap-1">
      <p className="truncate text-sm font-medium" title={nombre}>
        {nombre}
      </p>
      <EdicionAlt media={media} />
      <p className="text-xs text-muted-foreground">
        {[
          media.ancho && media.alto ? `${media.ancho}×${media.alto} px` : null,
          variantes,
          media.tipo !== 'imagen' ? media.tipo : null,
          enLista && nombreCarpeta ? `Carpeta: ${nombreCarpeta}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {distintivo}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={copiarUrl}
          aria-label={`Copiar URL de ${nombre}`}
        >
          <Copy className="size-3" />
          Copiar URL
        </Button>
      </div>
    </div>
  )

  const casilla = modoSeleccion ? (
    <Checkbox
      checked={seleccionado}
      onCheckedChange={() => onAlternar(media.id)}
      aria-label={`Seleccionar ${nombre}`}
      className={enLista ? 'shrink-0' : 'absolute left-2 top-2 z-10 bg-background'}
    />
  ) : null

  if (enLista) {
    return (
      <li
        {...propsArrastre}
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-card p-2',
          seleccionado ? 'ring-2 ring-primary' : '',
        )}
      >
        {casilla}
        {miniatura}
        <div className="min-w-0 flex-1">{datos}</div>
      </li>
    )
  }

  return (
    <li
      {...propsArrastre}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md',
        seleccionado ? 'ring-2 ring-primary' : '',
      )}
    >
      {casilla}
      {miniatura}
      <div className="p-3">{datos}</div>
    </li>
  )
}
