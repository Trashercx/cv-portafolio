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
import { CertificacionFormDialog } from '@/features/certificaciones/CertificacionFormDialog'
import type { Certificacion } from '@/features/certificaciones/types'
import {
  useCertificaciones,
  useEliminarCertificacion,
  useReordenarCertificaciones,
} from '@/features/certificaciones/useCertificaciones'
import { ApiError } from '@/lib/api-client'
import { calcularIntercambioOrdenPorId } from '@/lib/reorder'

/** UC-04 (Gestionar certificaciones): listado ordenado, con enlace de verificación funcional. */
export function CertificacionesListPage() {
  const { data: certificaciones, isLoading, error } = useCertificaciones()
  const reordenar = useReordenarCertificaciones()
  const eliminar = useEliminarCertificacion()

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [itemEditando, setItemEditando] = useState<Certificacion | null>(null)

  const ordenadas = [...(certificaciones ?? [])].sort(
    (a, b) => a.orden - b.orden,
  )

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    if (!certificaciones) return
    const intercambio = calcularIntercambioOrdenPorId(
      certificaciones,
      id,
      direccion,
    )
    if (!intercambio) return
    reordenar.mutate(intercambio)
  }

  const abrirNuevo = () => {
    setItemEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (certificacion: Certificacion) => {
    setItemEditando(certificacion)
    setDialogoAbierto(true)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Certificaciones</h1>
        <Button onClick={abrirNuevo}>Nueva certificación</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Cargando certificaciones…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar las certificaciones.'}
        </p>
      ) : null}
      {certificaciones && certificaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay certificaciones cargadas.
        </p>
      ) : null}

      {certificaciones && certificaciones.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Institución</TableHead>
              <TableHead>Verificación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((certificacion, index) => (
              <TableRow key={certificacion.id}>
                <TableCell>
                  <OrderButtons
                    disabled={reordenar.isPending}
                    disableSubir={index === 0}
                    disableBajar={index === ordenadas.length - 1}
                    onSubir={() => mover(certificacion.id, 'subir')}
                    onBajar={() => mover(certificacion.id, 'bajar')}
                  />
                </TableCell>
                <TableCell>{certificacion.nombre}</TableCell>
                <TableCell>{certificacion.institucion}</TableCell>
                <TableCell>
                  <a
                    href={certificacion.url_verificacion}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    Verificar
                  </a>
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEdicion(certificacion)}
                  >
                    Editar
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        Eliminar
                      </Button>
                    }
                    title={`¿Eliminar "${certificacion.nombre}"?`}
                    description="Esta acción no se puede deshacer."
                    isPending={eliminar.isPending}
                    onConfirm={() => eliminar.mutate(certificacion.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <CertificacionFormDialog
        certificacion={itemEditando}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
      />
    </div>
  )
}
