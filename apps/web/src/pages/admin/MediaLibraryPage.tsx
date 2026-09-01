import { FileIcon } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MediaDetailDialog } from '@/features/media/MediaDetailDialog'
import { useMediaList } from '@/features/media/useMediaLibrary'
import type { Media } from '@/features/media/types'
import { ApiError } from '@/lib/api-client'

const TIPOS_FILTRO = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'imagen', label: 'Imágenes' },
  { value: 'pdf', label: 'PDF' },
  { value: 'archivo', label: 'Otros archivos' },
]

/** UC-09 (Gestionar biblioteca multimedia): galería con filtro por tipo, edición/reemplazo/borrado en el detalle. */
export function MediaLibraryPage() {
  const [tipo, setTipo] = useState('todos')
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)

  const { data: media, isLoading, error } = useMediaList(
    tipo === 'todos' ? undefined : tipo,
  )

  // Deriva el elemento seleccionado de la lista fresca (no de una copia
  // local) para que el diálogo refleje `alt_text`/archivo actualizados tras
  // cada mutación, sin depender de re-sincronizar un objeto guardado aparte.
  const seleccionado: Media | null =
    (media ?? []).find((item) => item.id === seleccionadoId) ?? null

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Biblioteca de medios</h1>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_FILTRO.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando biblioteca…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudo cargar la biblioteca de medios.'}
        </p>
      ) : null}
      {media && media.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay archivos {tipo === 'todos' ? '' : `de tipo "${tipo}" `}en la
          biblioteca.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(media ?? []).map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => setSeleccionadoId(item.id)}
          >
            <div className="flex aspect-square items-center justify-center bg-muted">
              {item.tipo === 'imagen' ? (
                <img
                  src={item.url}
                  alt={item.alt_text ?? ''}
                  className="size-full object-cover"
                />
              ) : (
                <FileIcon className="size-10 text-muted-foreground" />
              )}
            </div>
            <CardContent className="grid gap-1 p-3">
              <p className="truncate text-sm font-medium">
                {item.alt_text || '(sin texto alternativo)'}
              </p>
              <p className="text-xs text-muted-foreground">{item.tipo}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {seleccionado ? (
        <MediaDetailDialog
          key={seleccionado.id}
          media={seleccionado}
          open={Boolean(seleccionado)}
          onOpenChange={(open) => {
            if (!open) setSeleccionadoId(null)
          }}
        />
      ) : null}
    </div>
  )
}
