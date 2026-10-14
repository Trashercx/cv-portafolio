import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ResultadoEliminarLote } from './types'

type EliminarLoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cantidad: number
  isPending: boolean
  /** Resultado de la última ejecución; con él el diálogo pasa a la fase de resumen. */
  resultado: ResultadoEliminarLote | null
  /** `id` → nombre de archivo, para listar los omitidos de forma legible. */
  nombres: Record<string, string>
  onConfirmar: () => void
}

/**
 * Confirmación de "Eliminar seleccionados" (Fase 7d, UC-09). Tras ejecutar
 * permanece abierto y lista los archivos omitidos (en uso) con su motivo: el
 * API nunca responde 409 global en el lote. La confirmación es un `Button`
 * normal (no `AlertDialogAction`) para que el diálogo no se cierre solo.
 */
export function EliminarLoteDialog({
  open,
  onOpenChange,
  cantidad,
  isPending,
  resultado,
  nombres,
  onConfirmar,
}: EliminarLoteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resultado
              ? 'Resultado de la eliminación'
              : `¿Eliminar ${cantidad} ${cantidad === 1 ? 'archivo' : 'archivos'}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resultado
              ? `Se eliminaron ${resultado.eliminados.length} y se omitieron ${resultado.omitidos.length}.`
              : 'Los archivos que estén en uso (perfil, proyectos, certificaciones, héroe, galerías o insignias) se omitirán.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {resultado && resultado.omitidos.length > 0 ? (
          <ul className="grid max-h-60 gap-1 overflow-y-auto text-sm" aria-label="Archivos omitidos">
            {resultado.omitidos.map((omitido) => (
              <li key={omitido.id}>
                <span className="font-medium">{nombres[omitido.id] ?? omitido.id}</span>
                {': '}
                <span className="text-muted-foreground">{omitido.motivo}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <AlertDialogFooter>
          {resultado ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          ) : (
            <>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={onConfirmar}
              >
                {isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
