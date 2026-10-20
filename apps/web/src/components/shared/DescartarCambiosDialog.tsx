import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type DescartarCambiosDialogProps = {
  open: boolean
  /** Seguir editando (también al cerrar con Escape). */
  onCancelar: () => void
  /** Descartar lo escrito y cerrar el formulario. */
  onConfirmar: () => void
}

/**
 * Fase 7m (#68): confirmación de "¿Descartar cambios?" que comparten todos los
 * `*FormDialog` (antes cada uno repetía el mismo `AlertDialog`). Se maneja con
 * `useCierreConCambios`.
 */
export function DescartarCambiosDialog({ open, onCancelar, onConfirmar }: DescartarCambiosDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(siguienteAbierto) => {
        if (!siguienteAbierto) onCancelar()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
          <AlertDialogDescription>Vas a perder lo que escribiste.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>Descartar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
