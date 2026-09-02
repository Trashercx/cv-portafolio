import { useState } from 'react'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { OrderButtons } from '@/components/shared/OrderButtons'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LogroFormDialog } from '@/features/logros/LogroFormDialog'
import type { Logro } from '@/features/logros/types'
import {
  useEliminarLogro,
  useLogros,
  useReordenarLogros,
} from '@/features/logros/useLogros'
import { ApiError } from '@/lib/api-client'
import { calcularIntercambioOrdenPorId } from '@/lib/reorder'

/** UC-05 (Gestionar logros y reconocimientos): listado, alta/edición/borrado inmediatos. */
export function LogrosListPage() {
  const { data: logros, isLoading, error } = useLogros()
  const reordenar = useReordenarLogros()
  const eliminar = useEliminarLogro()

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [itemEditando, setItemEditando] = useState<Logro | null>(null)

  const ordenados = [...(logros ?? [])].sort((a, b) => a.orden - b.orden)

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    if (!logros) return
    const intercambio = calcularIntercambioOrdenPorId(logros, id, direccion)
    if (!intercambio) return
    reordenar.mutate(intercambio)
  }

  const abrirNuevo = () => {
    setItemEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (logro: Logro) => {
    setItemEditando(logro)
    setDialogoAbierto(true)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">
          Logros y reconocimientos
        </h1>
        <Button onClick={abrirNuevo}>Nuevo logro</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando logros…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los logros.'}
        </p>
      ) : null}
      {logros && logros.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay logros cargados.
        </p>
      ) : null}

      {logros && logros.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((logro, index) => (
              <TableRow key={logro.id}>
                <TableCell>
                  <OrderButtons
                    disabled={reordenar.isPending}
                    disableSubir={index === 0}
                    disableBajar={index === ordenados.length - 1}
                    onSubir={() => mover(logro.id, 'subir')}
                    onBajar={() => mover(logro.id, 'bajar')}
                  />
                </TableCell>
                <TableCell>{logro.titulo}</TableCell>
                <TableCell>{logro.categoria}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEdicion(logro)}
                  >
                    Editar
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        Eliminar
                      </Button>
                    }
                    title={`¿Eliminar "${logro.titulo}"?`}
                    description="Esta acción no se puede deshacer."
                    isPending={eliminar.isPending}
                    onConfirm={() => eliminar.mutate(logro.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <LogroFormDialog
        logro={itemEditando}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
      />
    </div>
  )
}
