import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { OrderButtons } from '@/components/shared/OrderButtons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMediaList } from '@/features/media/useMediaLibrary'
import type { Insignia } from './types'
import {
  useActualizarInsignia,
  useEliminarInsignia,
  useReordenarInsignias,
} from './useInsignias'

/** Intercambia `id` con su vecino y devuelve los ids en el nuevo orden, o `null` si ya está en el extremo. */
export function calcularNuevoOrdenIds(
  ids: string[],
  id: string,
  direccion: 'subir' | 'bajar',
): string[] | null {
  const indice = ids.indexOf(id)
  const vecino = direccion === 'subir' ? indice - 1 : indice + 1
  if (indice === -1 || vecino < 0 || vecino >= ids.length) return null
  const copia = [...ids]
  ;[copia[indice], copia[vecino]] = [copia[vecino], copia[indice]]
  return copia
}

type ListaInsigniasProps = {
  insignias: Insignia[]
  onEditar: (insignia: Insignia) => void
}

/**
 * Fase 7d, UC-35: lista de insignias con el mismo patrón de reorden que
 * proyectos (botones subir/bajar), pero con `PATCH reordenar { ids }`;
 * ocultar/mostrar con `Switch` y borrado confirmado (no borra la media).
 */
export function ListaInsignias({ insignias, onEditar }: ListaInsigniasProps) {
  const reordenar = useReordenarInsignias()
  const actualizar = useActualizarInsignia()
  const eliminar = useEliminarInsignia()
  const { data: medias } = useMediaList()

  const ordenadas = [...insignias].sort((a, b) => a.orden - b.orden)
  const ids = ordenadas.map((insignia) => insignia.id)

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    const nuevoOrden = calcularNuevoOrdenIds(ids, id, direccion)
    if (nuevoOrden) reordenar.mutate(nuevoOrden)
  }

  const urlImagen = (insignia: Insignia) =>
    insignia.imagen?.url ?? medias?.find((media) => media.id === insignia.imagen_media_id)?.url

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Orden</TableHead>
          <TableHead className="w-20">Imagen</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden md:table-cell">Emisor</TableHead>
          <TableHead className="w-24">Visible</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenadas.map((insignia, index) => {
          const url = urlImagen(insignia)
          return (
            <TableRow key={insignia.id}>
              <TableCell>
                <OrderButtons
                  disabled={reordenar.isPending}
                  disableSubir={index === 0}
                  disableBajar={index === ordenadas.length - 1}
                  onSubir={() => mover(insignia.id, 'subir')}
                  onBajar={() => mover(insignia.id, 'bajar')}
                />
              </TableCell>
              <TableCell>
                {url ? (
                  <img src={url} alt="" className="size-12 object-contain" />
                ) : null}
              </TableCell>
              <TableCell>{insignia.nombre}</TableCell>
              <TableCell className="hidden md:table-cell">{insignia.emisor}</TableCell>
              <TableCell>
                <Switch
                  checked={insignia.visible}
                  aria-label={`${insignia.visible ? 'Ocultar' : 'Mostrar'} ${insignia.nombre}`}
                  disabled={actualizar.isPending}
                  onCheckedChange={(visible) =>
                    actualizar.mutate({ id: insignia.id, payload: { visible } })
                  }
                />
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onEditar(insignia)}>
                  Editar
                </Button>
                <ConfirmDeleteDialog
                  trigger={
                    <Button variant="destructive" size="sm">
                      Eliminar
                    </Button>
                  }
                  title={`¿Eliminar "${insignia.nombre}"?`}
                  description="Esta acción no se puede deshacer. La imagen se conserva en la biblioteca de medios."
                  isPending={eliminar.isPending}
                  onConfirm={() => eliminar.mutate(insignia.id)}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
