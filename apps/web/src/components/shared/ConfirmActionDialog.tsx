import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type ConfirmActionDialogProps = {
  /** Opcional si el diálogo se controla desde fuera con `open`/`onOpenChange` (Fase 7l, UC-11). */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (abierto: boolean) => void
  title: string
  description: string
  confirmLabel: string
  pendingLabel: string
  onConfirm: () => void
  isPending?: boolean
}

/**
 * `AlertDialog` de confirmación genérico para acciones no destructivas pero
 * de impacto público inmediato (UC-11: publicar, revertir) — mismo patrón
 * que `ConfirmDeleteDialog`, con etiquetas configurables en vez del
 * "Eliminar"/"Eliminando…" fijo de ese componente.
 */
export function ConfirmActionDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  onConfirm,
  isPending,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
