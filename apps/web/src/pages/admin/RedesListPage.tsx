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
import { PlataformaBadge } from '@/features/redes-sociales/iconos-plataforma'
import { RedFormDialog } from '@/features/redes-sociales/RedFormDialog'
import type { RedSocial } from '@/features/redes-sociales/types'
import {
  useEliminarRedSocial,
  useRedesSociales,
  useReordenarRedesSociales,
} from '@/features/redes-sociales/useRedesSociales'
import { ApiError } from '@/lib/api-client'
import { calcularIntercambioOrdenPorId } from '@/lib/reorder'

/** UC-06 (Gestionar enlaces de redes): cada enlace respeta el orden y la plataforma configurados. */
export function RedesListPage() {
  const { data: redes, isLoading, error } = useRedesSociales()
  const reordenar = useReordenarRedesSociales()
  const eliminar = useEliminarRedSocial()

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [itemEditando, setItemEditando] = useState<RedSocial | null>(null)

  const ordenadas = [...(redes ?? [])].sort((a, b) => a.orden - b.orden)

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    if (!redes) return
    const intercambio = calcularIntercambioOrdenPorId(redes, id, direccion)
    if (!intercambio) return
    reordenar.mutate(intercambio)
  }

  const abrirNuevo = () => {
    setItemEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (red: RedSocial) => {
    setItemEditando(red)
    setDialogoAbierto(true)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Redes sociales</h1>
        <Button onClick={abrirNuevo}>Nuevo enlace</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando enlaces…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar las redes sociales.'}
        </p>
      ) : null}
      {redes && redes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay enlaces de redes cargados.
        </p>
      ) : null}

      {redes && redes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead className="hidden md:table-cell">URL</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((red, index) => (
              <TableRow key={red.id}>
                <TableCell>
                  <OrderButtons
                    disabled={reordenar.isPending}
                    disableSubir={index === 0}
                    disableBajar={index === ordenadas.length - 1}
                    onSubir={() => mover(red.id, 'subir')}
                    onBajar={() => mover(red.id, 'bajar')}
                  />
                </TableCell>
                <TableCell>
                  <PlataformaBadge plataforma={red.plataforma} />
                </TableCell>
                <TableCell className="hidden max-w-xs break-all md:table-cell">
                  <a
                    href={red.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {red.url}
                  </a>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEdicion(red)}
                  >
                    Editar
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        Eliminar
                      </Button>
                    }
                    title={`¿Eliminar el enlace de ${red.plataforma.nombre}?`}
                    description="Esta acción no se puede deshacer."
                    isPending={eliminar.isPending}
                    onConfirm={() => eliminar.mutate(red.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <RedFormDialog
        red={itemEditando}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
      />
    </div>
  )
}
