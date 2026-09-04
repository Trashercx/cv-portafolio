import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type DialogDetalleProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

/**
 * Modal casi a pantalla completa para el detalle de un proyecto/
 * certificación/logro abierto desde una tarjeta de la home (Fase 4.3, UC-13)
 * — mismo patrón que `DialogVistaPrevia` (`h-[90vh]`, `sm:max-w-[95vw]`).
 * `DialogTitle`/`DialogDescription` quedan ocultos visualmente (`sr-only`):
 * el propio `children` (un `Detalle*Contenido`) ya trae su propio `<h1>`
 * visible, pero Radix exige un título/descripción accesibles en todo
 * `DialogContent`.
 */
export function DialogDetalle({ open, onOpenChange, children }: DialogDetalleProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col overflow-y-auto sm:max-w-[95vw]">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalle</DialogTitle>
          <DialogDescription>Detalle del elemento seleccionado.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
