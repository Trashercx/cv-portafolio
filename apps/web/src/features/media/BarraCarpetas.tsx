import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDown,
  ArrowUp,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { CarpetaMedia } from './types'
import {
  useCrearCarpeta,
  useEliminarCarpeta,
  useMoverMedia,
  useRenombrarCarpeta,
  useReordenarCarpetas,
} from './useCarpetasMedia'

/** Tipo MIME propio del arrastre de tarjetas: JSON con los ids a mover (Fase 7e, UC-09). */
export const MIME_IDS_MEDIA = 'application/x-media-ids'

/** Valor de la carpeta activa: id, `'ninguna'` o `undefined` (todos). */
export type CarpetaActiva = string | undefined

const esquemaNombre = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(60, 'Máximo 60 caracteres.'),
})
type ValoresNombre = z.infer<typeof esquemaNombre>

type NombreCarpetaDialogProps = {
  titulo: string
  etiquetaAccion: string
  valorInicial: string
  onOpenChange: (open: boolean) => void
  /** Rechaza con `ApiError` 409 si el nombre existe: el diálogo lo muestra en el campo. */
  onGuardar: (nombre: string) => Promise<unknown>
}

/** Diálogo de nombre de carpeta (crear y renombrar), con React Hook Form + Zod. */
function NombreCarpetaDialog({
  titulo,
  etiquetaAccion,
  valorInicial,
  onOpenChange,
  onGuardar,
}: NombreCarpetaDialogProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ValoresNombre>({
    resolver: zodResolver(esquemaNombre),
    defaultValues: { nombre: valorInicial },
  })

  const enviar = handleSubmit(async ({ nombre }) => {
    try {
      await onGuardar(nombre)
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('nombre', { message: 'Ya existe una carpeta con ese nombre' })
      } else {
        setError('nombre', { message: 'No se pudo guardar la carpeta.' })
      }
    }
  })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={enviar} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="nombre-carpeta">Nombre de la carpeta</Label>
            <Input
              id="nombre-carpeta"
              autoFocus
              maxLength={80}
              aria-invalid={errors.nombre ? true : undefined}
              {...register('nombre')}
            />
            {errors.nombre ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.nombre.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {etiquetaAccion}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type BarraCarpetasProps = {
  carpetas: CarpetaMedia[]
  activa: CarpetaActiva
  onSeleccionar: (valor: CarpetaActiva) => void
  /** Se llama tras mover por arrastre (la página limpia su selección). */
  onMovidos?: () => void
}

/**
 * Barra de carpetas de la biblioteca (Fase 7e, UC-09): "Todos", "Sin carpeta"
 * y las carpetas con su total. Lateral en escritorio y fila de chips con
 * scroll horizontal en < 640 px. Cada carpeta y "Sin carpeta" es destino de
 * arrastre HTML5 nativo (`MIME_IDS_MEDIA`).
 */
export function BarraCarpetas({
  carpetas,
  activa,
  onSeleccionar,
  onMovidos,
}: BarraCarpetasProps) {
  const [dialogo, setDialogo] = useState<
    { tipo: 'crear' } | { tipo: 'renombrar'; carpeta: CarpetaMedia } | null
  >(null)
  const [aEliminar, setAEliminar] = useState<CarpetaMedia | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)

  const crear = useCrearCarpeta()
  const renombrar = useRenombrarCarpeta()
  const reordenar = useReordenarCarpetas()
  const eliminar = useEliminarCarpeta()
  const mover = useMoverMedia()

  const reordenarCarpeta = (indice: number, delta: -1 | 1) => {
    const ids = carpetas.map((c) => c.id)
    const destino = indice + delta
    if (destino < 0 || destino >= ids.length) return
    ;[ids[indice], ids[destino]] = [ids[destino], ids[indice]]
    reordenar.mutate(ids)
  }

  const traeIds = (evento: DragEvent) =>
    Array.from(evento.dataTransfer.types).includes(MIME_IDS_MEDIA)

  /** Props de destino de arrastre para `valor` (id de carpeta o `'ninguna'`). */
  const destino = (valor: string) => ({
    onDragOver: (evento: DragEvent) => {
      if (!traeIds(evento)) return
      // Requerido para que el navegador permita el `drop`.
      evento.preventDefault()
      setSobre(valor)
    },
    onDragLeave: () => setSobre((actual) => (actual === valor ? null : actual)),
    onDrop: (evento: DragEvent) => {
      if (!traeIds(evento)) return
      evento.preventDefault()
      setSobre(null)
      let ids: unknown
      try {
        ids = JSON.parse(evento.dataTransfer.getData(MIME_IDS_MEDIA))
      } catch {
        return
      }
      if (!Array.isArray(ids) || ids.length === 0) return
      mover.mutate(
        { ids: ids as string[], carpeta_id: valor === 'ninguna' ? null : valor },
        { onSuccess: () => onMovidos?.() },
      )
    },
  })

  const claseChip = (seleccionada: boolean, resaltada: boolean) =>
    cn(
      'flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors sm:w-full',
      seleccionada ? 'bg-secondary font-medium' : 'bg-card hover:bg-accent',
      resaltada ? 'ring-2 ring-primary bg-accent' : '',
    )

  return (
    <nav
      aria-label="Carpetas de la biblioteca"
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-fina sm:flex-col sm:overflow-visible sm:pb-0"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 sm:w-full sm:justify-start"
        onClick={() => setDialogo({ tipo: 'crear' })}
      >
        <FolderPlus />
        Nueva carpeta
      </Button>

      <button
        type="button"
        aria-pressed={activa === undefined}
        className={claseChip(activa === undefined, false)}
        onClick={() => onSeleccionar(undefined)}
      >
        <FolderOpen className="size-4" aria-hidden="true" />
        Todos
      </button>

      <button
        type="button"
        aria-pressed={activa === 'ninguna'}
        data-destino="ninguna"
        className={claseChip(activa === 'ninguna', sobre === 'ninguna')}
        onClick={() => onSeleccionar('ninguna')}
        {...destino('ninguna')}
      >
        <Folder className="size-4" aria-hidden="true" />
        Sin carpeta
      </button>

      {carpetas.map((carpeta, indice) => (
        <div
          key={carpeta.id}
          data-destino={carpeta.id}
          className={cn(
            'flex shrink-0 items-center rounded-md border transition-colors sm:w-full',
            activa === carpeta.id ? 'bg-secondary font-medium' : 'bg-card hover:bg-accent',
            sobre === carpeta.id ? 'ring-2 ring-primary bg-accent' : '',
          )}
          {...destino(carpeta.id)}
        >
          <button
            type="button"
            aria-pressed={activa === carpeta.id}
            className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm"
            onClick={() => onSeleccionar(carpeta.id)}
          >
            <Folder className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{carpeta.nombre}</span>
            <span className="ml-auto text-xs text-muted-foreground">{carpeta.total}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                aria-label={`Opciones de la carpeta ${carpeta.nombre}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDialogo({ tipo: 'renombrar', carpeta })}>
                <Pencil />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={indice === 0} onSelect={() => reordenarCarpeta(indice, -1)}>
                <ArrowUp />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={indice === carpetas.length - 1}
                onSelect={() => reordenarCarpeta(indice, 1)}
              >
                <ArrowDown />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setAEliminar(carpeta)}>
                <Trash2 />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {dialogo?.tipo === 'crear' ? (
        <NombreCarpetaDialog
          titulo="Nueva carpeta"
          etiquetaAccion="Crear"
          valorInicial=""
          onOpenChange={(open) => !open && setDialogo(null)}
          onGuardar={(nombre) => crear.mutateAsync(nombre)}
        />
      ) : null}
      {dialogo?.tipo === 'renombrar' ? (
        <NombreCarpetaDialog
          titulo="Renombrar carpeta"
          etiquetaAccion="Guardar"
          valorInicial={dialogo.carpeta.nombre}
          onOpenChange={(open) => !open && setDialogo(null)}
          onGuardar={(nombre) => renombrar.mutateAsync({ id: dialogo.carpeta.id, nombre })}
        />
      ) : null}

      <AlertDialog open={aEliminar !== null} onOpenChange={(open) => !open && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`¿Eliminar la carpeta "${aEliminar?.nombre ?? ''}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Los archivos de la carpeta no se borran: quedan sin carpeta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!aEliminar) return
                const id = aEliminar.id
                eliminar.mutate(id, {
                  onSuccess: () => {
                    if (activa === id) onSeleccionar(undefined)
                  },
                })
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}
