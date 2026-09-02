import { useState } from 'react'
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

type MediaFieldProps = {
  /** Texto descriptivo, compartido por ambas pestañas. */
  label: string
  currentMediaId?: string | null
  currentPreviewUrl?: string | null
  onUploaded: (media: Media) => void
  onClear?: () => void
  disabled?: boolean
}

/**
 * Campo de imagen con dos formas de completarlo: subir un archivo nuevo
 * (`MediaUploadField`, con su flujo de confirmación de dos pasos) o elegir
 * una ya existente en la biblioteca (UC-09, `GET /admin/media?tipo=imagen`)
 * desde una grilla de miniaturas dentro de un diálogo.
 *
 * Solo imágenes: reemplaza al `MediaUploadField` suelto en los campos donde
 * "elegir de biblioteca" tiene sentido (foto de perfil, logo de
 * certificación, galería de proyectos) — nunca en el CV en PDF.
 */
export function MediaField({
  label,
  currentMediaId,
  currentPreviewUrl,
  onUploaded,
  onClear,
  disabled,
}: MediaFieldProps) {
  return (
    <div className="grid gap-2">
      <Tabs defaultValue="subir">
        <TabsList>
          <TabsTrigger value="subir">Subir nuevo</TabsTrigger>
          <TabsTrigger value="biblioteca">Elegir de biblioteca</TabsTrigger>
        </TabsList>
        <TabsContent value="subir">
          <MediaUploadField
            label={label}
            accept="image/*"
            tipo="imagen"
            currentMediaId={currentMediaId}
            currentPreviewUrl={currentPreviewUrl}
            onUploaded={onUploaded}
            onClear={onClear}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value="biblioteca">
          <SelectorBibliotecaImagen
            label={label}
            currentMediaId={currentMediaId}
            currentPreviewUrl={currentPreviewUrl}
            onSeleccionar={onUploaded}
            onClear={onClear}
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SelectorBibliotecaImagen({
  label,
  currentMediaId,
  currentPreviewUrl,
  onSeleccionar,
  onClear,
  disabled,
}: {
  label: string
  currentMediaId?: string | null
  currentPreviewUrl?: string | null
  onSeleccionar: (media: Media) => void
  onClear?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>

      {currentPreviewUrl ? (
        <img
          src={currentPreviewUrl}
          alt=""
          className="h-32 w-32 rounded-md border object-cover"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elegir imagen de la biblioteca</DialogTitle>
          </DialogHeader>
          <GrillaImagenesBiblioteca
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
function GrillaImagenesBiblioteca({
  onSeleccionar,
}: {
  onSeleccionar: (media: Media) => void
}) {
  const { data: imagenes, isLoading } = useMediaList('imagen')

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando imágenes…</p>
    )
  }

  if (!imagenes || imagenes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay imágenes en la biblioteca. Sube una desde la pestaña
        "Subir nuevo".
      </p>
    )
  }

  return (
    <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
      {imagenes.map((imagen) => (
        <button
          key={imagen.id}
          type="button"
          className="overflow-hidden rounded-md border transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => onSeleccionar(imagen)}
        >
          <img
            src={imagen.url}
            alt={imagen.alt_text ?? ''}
            className="aspect-square w-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}
