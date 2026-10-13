import { useState } from 'react'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { OrderButtons } from '@/components/shared/OrderButtons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProyectoFormDialog } from '@/features/proyectos/ProyectoFormDialog'
import type { ProyectoBase } from '@/features/proyectos/types'
import {
  useEliminarProyecto,
  useReordenarProyectos,
} from '@/features/proyectos/useProyectoMutations'
import { useProyectos } from '@/features/proyectos/useProyectos'
import { useComandosContextuales } from '@/features/paleta-comandos/contexto-paleta'
import { ApiError } from '@/lib/api-client'
import { calcularIntercambioOrdenPorId } from '@/lib/reorder'

/** UC-03 (Gestionar proyectos): listado respetando `orden`, con subir/bajar y borrado confirmado. */
export function ProyectosListPage() {
  const { data: proyectos, isLoading, error } = useProyectos()
  const reordenar = useReordenarProyectos()
  const eliminar = useEliminarProyecto()

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [itemEditando, setItemEditando] = useState<ProyectoBase | null>(null)

  const ordenados = [...(proyectos ?? [])].sort((a, b) => a.orden - b.orden)

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    if (!proyectos) return
    const intercambio = calcularIntercambioOrdenPorId(proyectos, id, direccion)
    if (!intercambio) return
    reordenar.mutate(intercambio)
  }

  const abrirNuevo = () => {
    setItemEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (proyecto: ProyectoBase) => {
    setItemEditando(proyecto)
    setDialogoAbierto(true)
  }

  useComandosContextuales([
    { id: 'nuevo-proyecto', etiqueta: 'Nuevo proyecto', accion: abrirNuevo },
  ])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Proyectos</h1>
        <Button onClick={abrirNuevo}>Nuevo proyecto</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando proyectos…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los proyectos.'}
        </p>
      ) : null}

      {proyectos && proyectos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay proyectos cargados.
        </p>
      ) : null}

      {proyectos && proyectos.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Estado</TableHead>
              <TableHead className="hidden md:table-cell">Destacado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((proyecto, index) => (
              <TableRow key={proyecto.id}>
                <TableCell>
                  <OrderButtons
                    disabled={reordenar.isPending}
                    disableSubir={index === 0}
                    disableBajar={index === ordenados.length - 1}
                    onSubir={() => mover(proyecto.id, 'subir')}
                    onBajar={() => mover(proyecto.id, 'bajar')}
                  />
                </TableCell>
                <TableCell>{proyecto.titulo}</TableCell>
                <TableCell className="hidden md:table-cell">{proyecto.estado}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {proyecto.destacado ? <Badge>Destacado</Badge> : null}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEdicion(proyecto)}
                  >
                    Editar
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        Eliminar
                      </Button>
                    }
                    title={`¿Eliminar "${proyecto.titulo}"?`}
                    description="Esta acción no se puede deshacer."
                    isPending={eliminar.isPending}
                    onConfirm={() => eliminar.mutate(proyecto.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <ProyectoFormDialog
        proyecto={itemEditando}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
      />
    </div>
  )
}
