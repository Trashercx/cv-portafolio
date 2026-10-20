import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { OrderButtons } from '@/components/shared/OrderButtons'
import { Badge } from '@/components/ui/badge'
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
import { formatearFecha } from '@/lib/formato'
import { calcularIntercambioOrdenPorId } from '@/lib/reorder'
import { etiquetaModalidad, type Experiencia } from './types'
import {
  useActualizarExperiencia,
  useEliminarExperiencia,
  useReordenarExperiencias,
} from './useExperiencias'

type ListaExperienciasProps = {
  experiencias: Experiencia[]
  onEditar: (experiencia: Experiencia) => void
}

/**
 * Fase 7l, UC-19: lista de experiencias con el patrón de las demás listas del
 * panel (subir/bajar con `PATCH reordenar { items }`, ocultar/mostrar con
 * `Switch` y borrado confirmado).
 */
export function ListaExperiencias({ experiencias, onEditar }: ListaExperienciasProps) {
  const reordenar = useReordenarExperiencias()
  const actualizar = useActualizarExperiencia()
  const eliminar = useEliminarExperiencia()

  const ordenadas = [...experiencias].sort((a, b) => a.orden - b.orden)

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    const intercambio = calcularIntercambioOrdenPorId(experiencias, id, direccion)
    if (intercambio) reordenar.mutate(intercambio)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Orden</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead className="hidden md:table-cell">Empresa</TableHead>
          <TableHead className="hidden md:table-cell">Periodo</TableHead>
          <TableHead className="w-24">Visible</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenadas.map((experiencia, index) => (
          <TableRow key={experiencia.id}>
            <TableCell>
              <OrderButtons
                disabled={reordenar.isPending}
                disableSubir={index === 0}
                disableBajar={index === ordenadas.length - 1}
                onSubir={() => mover(experiencia.id, 'subir')}
                onBajar={() => mover(experiencia.id, 'bajar')}
              />
            </TableCell>
            <TableCell>
              <span className="font-medium">{experiencia.cargo}</span>
              <span className="block text-xs text-muted-foreground md:hidden">
                {experiencia.empresa}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {experiencia.empresa}
              <span className="block text-xs text-muted-foreground">
                {etiquetaModalidad(experiencia.modalidad)}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatearFecha(experiencia.fecha_inicio)}
              {' – '}
              {experiencia.fecha_fin ? (
                formatearFecha(experiencia.fecha_fin)
              ) : (
                <Badge variant="secondary">Actual</Badge>
              )}
            </TableCell>
            <TableCell>
              <Switch
                checked={experiencia.visible}
                aria-label={`${experiencia.visible ? 'Ocultar' : 'Mostrar'} ${experiencia.cargo} en ${experiencia.empresa}`}
                disabled={actualizar.isPending}
                onCheckedChange={(visible) =>
                  actualizar.mutate({ id: experiencia.id, payload: { visible } })
                }
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onEditar(experiencia)}>
                Editar
              </Button>
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    Eliminar
                  </Button>
                }
                title={`¿Eliminar "${experiencia.cargo}"?`}
                description="Esta acción no se puede deshacer."
                isPending={eliminar.isPending}
                onConfirm={() => eliminar.mutate(experiencia.id)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
