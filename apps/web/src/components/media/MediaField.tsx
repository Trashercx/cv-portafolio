import { FileIcon } from 'lucide-react'
import { useState } from 'react'
import { MediaPreview } from '@/components/media/MediaPreview'
import { MediaUploadField } from '@/components/media/MediaUploadField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaList } from '@/features/media/useMediaLibrary'
import type { Media } from '@/features/media/types'

/** Tipos de `Media` que un `MediaField` puede aceptar (subida + biblioteca). */
export type MediaTipoPermitido = 'imagen' | 'pdf'

const ACCEPT_POR_TIPO: Record<MediaTipoPermitido, string> = {
  imagen: 'image/*',
  pdf: 'application/pdf',
}

type MediaFieldProps = {
  /** Texto descriptivo, compartido por ambas pestañas. */
  label: string
  currentMediaId?: string | null
  currentPreviewUrl?: string | null
  /** `Media.tipo` de `currentMediaId`/`currentPreviewUrl`, si ya se conoce. Por defecto "imagen" (comportamiento histórico). */
  currentMediaTipo?: string | null
  onUploaded: (media: Media) => void
  onClear?: () => void
  disabled?: boolean
  /**
   * Tipos de `Media` aceptados por este campo, tanto al subir como al
   * elegir de la biblioteca. Por defecto solo `"imagen"` — foto de perfil y
   * galería de proyectos deben seguir restringidas a imagen. Certificación
   * (UC-04) agrega `"pdf"`: el feedback externo señala que el certificado
   * debe poder mostrarse como documento verificable, no solo como logo de
   * la institución.
   */
  tiposPermitidos?: MediaTipoPermitido[]
}

/**
 * Campo de archivo con dos formas de completarlo: subir uno nuevo
 * (`MediaUploadField`, con su flujo de confirmación de dos pasos) o elegir
 * uno ya existente en la biblioteca (UC-09, `GET /admin/media?tipo=`) desde
 * una grilla de miniaturas dentro de un diálogo.
 *
 * `tiposPermitidos` (por defecto `["imagen"]`) acota qué puede subirse/
 * elegirse: foto de perfil y galería de proyectos deben seguir restringidas
 * a imagen; el logo/documento de certificación es el único campo que hoy
 * permite además `"pdf"`. Nunca se usa para el CV en PDF del perfil (ese
 * campo usa `MediaUploadField` suelto, sin "elegir de biblioteca").
 */
export function MediaField({
  label,
  currentMediaId,
  currentPreviewUrl,
  currentMediaTipo,
  onUploaded,
  onClear,
  disabled,
  tiposPermitidos = ['imagen'],
}: MediaFieldProps) {
  const accept = tiposPermitidos.map((tipo) => ACCEPT_POR_TIPO[tipo]).join(',')
  // Con un solo tipo permitido se lo declara explícito (comportamiento
  // histórico); con varios, se omite y el backend lo infiere del mimetype
  // real del archivo subido (`MediaService.inferirTipo`).
  const tipoSubida = tiposPermitidos.length === 1 ? tiposPermitidos[0] : undefined

  return (
    <div className="grid gap-2">
      <Tabs defaultValue="subir">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subir">Subir nuevo</TabsTrigger>
          <TabsTrigger value="biblioteca">Elegir de biblioteca</TabsTrigger>
        </TabsList>
        <TabsContent value="subir">
          <MediaUploadField
            label={label}
            accept={accept}
            tipo={tipoSubida}
            currentMediaId={currentMediaId}
            currentPreviewUrl={currentPreviewUrl}
            currentMediaTipo={currentMediaTipo}
            onUploaded={onUploaded}
            onClear={onClear}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value="biblioteca">
          <SelectorBibliotecaMedia
            label={label}
            currentMediaId={currentMediaId}
            currentPreviewUrl={currentPreviewUrl}
            currentMediaTipo={currentMediaTipo}
            tiposPermitidos={tiposPermitidos}
            onSeleccionar={onUploaded}
            onClear={onClear}
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SelectorBibliotecaMedia({
  label,
  currentMediaId,
  currentPreviewUrl,
  currentMediaTipo,
  tiposPermitidos,
  onSeleccionar,
  onClear,
  disabled,
}: {
  label: string
  currentMediaId?: string | null
  currentPreviewUrl?: string | null
  currentMediaTipo?: string | null
  tiposPermitidos: MediaTipoPermitido[]
  onSeleccionar: (media: Media) => void
  onClear?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>

      {currentPreviewUrl ? (
        <MediaPreview
          tipo={currentMediaTipo ?? 'imagen'}
          url={currentPreviewUrl}
          alt=""
        />
      ) : currentMediaId ? (
        <p className="text-sm text-muted-foreground">
          Archivo ya cargado (sin previsualización disponible).
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          Elegir de biblioteca
        </Button>
        {(currentMediaId || currentPreviewUrl) && onClear ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onClear}
          >
            Quitar
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
          <DialogHeader>
            <DialogTitle>Elegir de la biblioteca</DialogTitle>
          </DialogHeader>
          <GrillaMediaBiblioteca
            tiposPermitidos={tiposPermitidos}
            onSeleccionar={(media) => {
              onSeleccionar(media)
              setOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Solo se monta (y por lo tanto solo llama a `useMediaList`) mientras el
 * diálogo está abierto — Radix desmonta `DialogContent` cuando `open` es
 * `false`, así que no hay una llamada de red de fondo innecesaria mientras
 * el admin no abrió "Elegir de biblioteca".
 */
function GrillaMediaBiblioteca({
  tiposPermitidos,
  onSeleccionar,
}: {
  tiposPermitidos: MediaTipoPermitido[]
  onSeleccionar: (media: Media) => void
}) {
  // Con un solo tipo permitido se filtra en el servidor (menos datos
  // transferidos, y es el caso que ya cubrían los tests existentes). El
  // filtro de `GET /admin/media?tipo=` solo acepta un valor a la vez, así
  // que con varios tipos permitidos se trae la biblioteca completa y se
  // filtra acá.
  const tipoFiltroServidor =
    tiposPermitidos.length === 1 ? tiposPermitidos[0] : undefined
  const { data: media, isLoading } = useMediaList(tipoFiltroServidor)

  const disponibles = (media ?? []).filter((item) =>
    tiposPermitidos.includes(item.tipo as MediaTipoPermitido),
  )

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando archivos…</p>
    )
  }

  if (disponibles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay archivos de este tipo en la biblioteca. Sube uno desde
        la pestaña "Subir nuevo".
      </p>
    )
  }

  return (
    <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto scrollbar-fina sm:grid-cols-4">
      {disponibles.map((item) => (
        <button
          key={item.id}
          type="button"
          className="overflow-hidden rounded-md border transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => onSeleccionar(item)}
        >
          {item.tipo === 'imagen' ? (
            <img
              src={item.url}
              alt={item.alt_text ?? ''}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <span className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-muted p-2 text-center">
              <FileIcon className="size-8 text-muted-foreground" />
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {item.alt_text || item.tipo}
              </span>
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
