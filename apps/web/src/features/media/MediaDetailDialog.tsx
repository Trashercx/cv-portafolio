import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import type { Media } from './types'
import {
  useActualizarMedia,
  useEliminarMedia,
  useReemplazarMedia,
} from './useMediaLibrary'

type MediaDetailDialogProps = {
  media: Media
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * UC-09: detalle de un archivo de la biblioteca — edición de `alt_text`,
 * reemplazo de archivo (misma fila, mismo `id`) y borrado con confirmación.
 * Si el borrado responde 409 (archivo en uso), el mensaje se muestra tal
 * cual y el archivo permanece en la lista (no se cierra el diálogo).
 *
 * El padre (`MediaLibraryPage`) monta este componente con `key={media.id}`,
 * así que el estado local de `alt_text` se reinicia solo al cambiar de
 * archivo seleccionado — no hace falta un efecto para resincronizarlo.
 */
export function MediaDetailDialog({
  media,
  open,
  onOpenChange,
}: MediaDetailDialogProps) {
  const altTextInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [altText, setAltText] = useState(media.alt_text ?? '')

  const actualizar = useActualizarMedia()
  const eliminar = useEliminarMedia()
  const reemplazar = useReemplazarMedia()

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof ApiError ? error.message : error ? fallback : null

  const handleReemplazar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    reemplazar.mutate({ id: media.id, file })
  }

  const handleEliminar = () => {
    eliminar.mutate(media.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle del archivo</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {media.tipo === 'imagen' ? (
            <img
              src={media.url}
              alt={media.alt_text ?? ''}
              className="max-h-64 w-full rounded-md border object-contain"
            />
          ) : (
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              Abrir archivo ({media.tipo})
            </a>
          )}

          <div className="grid gap-2">
            <Label htmlFor={altTextInputId}>Texto alternativo</Label>
            <div className="flex gap-2">
              <Input
                id={altTextInputId}
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={actualizar.isPending}
                onClick={() =>
                  actualizar.mutate({ id: media.id, alt_text: altText })
                }
              >
                {actualizar.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
            {errorMessage(actualizar.error, 'No se pudo actualizar el texto alternativo.') ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(actualizar.error, 'No se pudo actualizar el texto alternativo.')}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${altTextInputId}-file`}>Reemplazar archivo</Label>
            <Input
              id={`${altTextInputId}-file`}
              ref={fileInputRef}
              type="file"
              disabled={reemplazar.isPending}
              onChange={handleReemplazar}
            />
            {reemplazar.isPending ? (
              <p className="text-sm text-muted-foreground">Subiendo…</p>
            ) : null}
            {errorMessage(reemplazar.error, 'No se pudo reemplazar el archivo.') ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage(reemplazar.error, 'No se pudo reemplazar el archivo.')}
              </p>
            ) : null}
          </div>

          {errorMessage(eliminar.error, 'No se pudo eliminar el archivo.') ? (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(eliminar.error, 'No se pudo eliminar el archivo.')}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <ConfirmDeleteDialog
            trigger={
              <Button variant="destructive">Eliminar</Button>
            }
            title="¿Eliminar este archivo?"
            description="Si está en uso en proyectos, certificaciones o el perfil, el servidor rechazará el borrado."
            isPending={eliminar.isPending}
            onConfirm={handleEliminar}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
