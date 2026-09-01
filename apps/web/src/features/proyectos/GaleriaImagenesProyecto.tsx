import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { OrderButtons } from '@/components/shared/OrderButtons'
import { MediaUploadField } from '@/components/media/MediaUploadField'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { calcularIntercambioOrdenPorMediaId } from '@/lib/reorder'
import {
  useAgregarImagenProyecto,
  useQuitarImagenProyecto,
  useReordenarImagenesProyecto,
} from './useProyectoMutations'
import type { ProyectoImagen } from './types'

type GaleriaImagenesProyectoProps = {
  proyectoId: string
  imagenes: ProyectoImagen[]
}

/**
 * Galería simple de imágenes ya asociadas al proyecto (UC-03): sube vía
 * `MediaUploadField` (`POST /admin/media`) y asocia el `media_id` resultante
 * con `POST /admin/proyectos/:id/imagenes`. Reordenar con subir/bajar
 * (`PATCH .../imagenes/reordenar`), quitar con confirmación.
 */
export function GaleriaImagenesProyecto({
  proyectoId,
  imagenes,
}: GaleriaImagenesProyectoProps) {
  const agregar = useAgregarImagenProyecto(proyectoId)
  const quitar = useQuitarImagenProyecto(proyectoId)
  const reordenar = useReordenarImagenesProyecto(proyectoId)

  const ordenadas = [...imagenes].sort((a, b) => a.orden - b.orden)
  const siguienteOrden =
    ordenadas.length > 0 ? Math.max(...ordenadas.map((i) => i.orden)) + 1 : 0

  const mover = (mediaId: string, direccion: 'subir' | 'bajar') => {
    const intercambio = calcularIntercambioOrdenPorMediaId(
      imagenes,
      mediaId,
      direccion,
    )
    if (!intercambio) return
    reordenar.mutate(intercambio)
  }

  const error = agregar.error ?? quitar.error ?? reordenar.error
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? 'No se pudo actualizar la galería de imágenes.'
        : null

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">Imágenes</p>

      {ordenadas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay imágenes asociadas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {ordenadas.map((imagen, index) => (
            <div key={imagen.media_id} className="grid gap-2">
              <img
                src={imagen.media.url}
                alt={imagen.media.alt_text ?? ''}
                className="h-28 w-28 rounded-md border object-cover"
              />
              <div className="flex items-center gap-1">
                <OrderButtons
                  disabled={reordenar.isPending}
                  disableSubir={index === 0}
                  disableBajar={index === ordenadas.length - 1}
                  onSubir={() => mover(imagen.media_id, 'subir')}
                  onBajar={() => mover(imagen.media_id, 'bajar')}
                />
                <ConfirmDeleteDialog
                  trigger={
                    <Button variant="destructive" size="icon-sm">
                      ×
                    </Button>
                  }
                  title="¿Quitar esta imagen del proyecto?"
                  description="La imagen deja de aparecer en la galería del proyecto."
                  isPending={quitar.isPending}
                  onConfirm={() => quitar.mutate(imagen.media_id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaUploadField
        label="Agregar imagen"
        accept="image/*"
        tipo="imagen"
        onUploaded={(media) =>
          agregar.mutate({ media_id: media.id, orden: siguienteOrden })
        }
      />

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
