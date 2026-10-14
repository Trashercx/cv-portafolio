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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api-client'
import type { Media, UsoMedia } from './types'
import { useCarpetasMedia, useMoverMedia } from './useCarpetasMedia'
import {
  useActualizarMedia,
  useEliminarMedia,
  useReemplazarMedia,
} from './useMediaLibrary'

type MediaDetailDialogProps = {
  media: Media
  /** Fase 7d: usos del archivo (`GET /admin/media/usos`); con usos, "Eliminar" queda deshabilitado. */
  usos?: UsoMedia[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * UC-09 (Fase 7d: muestra los usos y bloquea el borrado si hay): detalle de un archivo de la biblioteca — edición de `alt_text`,
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
  usos = [],
  open,
  onOpenChange,
}: MediaDetailDialogProps) {
  const altTextInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [altText, setAltText] = useState(media.alt_text ?? '')

  const actualizar = useActualizarMedia()
  const eliminar = useEliminarMedia()
  const reemplazar = useReemplazarMedia()
  // Fase 7e (UC-09): mover este archivo de carpeta.
  const { data: carpetas = [] } = useCarpetasMedia()
  const moverMedia = useMoverMedia()

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
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
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
            <Label htmlFor={`${altTextInputId}-carpeta`}>Carpeta</Label>
            <Select
              value={media.carpeta_id ?? 'ninguna'}
              disabled={moverMedia.isPending}
              onValueChange={(valor) =>
                moverMedia.mutate({
                  ids: [media.id],
                  carpeta_id: valor === 'ninguna' ? null : valor,
                })
              }
            >
              <SelectTrigger id={`${altTextInputId}-carpeta`} aria-label="Carpeta del archivo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Sin carpeta</SelectItem>
                {carpetas.map((carpeta) => (
                  <SelectItem key={carpeta.id} value={carpeta.id}>
                    {carpeta.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="grid gap-1">
            <p className="text-sm font-medium">Usos</p>
            {usos.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {usos.map((uso) => (
                  <li key={`${uso.tipo}-${uso.id}`}>{`${uso.tipo}: ${uso.nombre}`}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No se usa en ningún lugar.
              </p>
            )}
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
              <Button variant="destructive" disabled={usos.length > 0}>
                Eliminar
              </Button>
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
