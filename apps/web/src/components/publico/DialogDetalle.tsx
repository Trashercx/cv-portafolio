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
  /**
   * Nodo DOM del `<div>` temado que envuelve esta sección (ver
   * `PublicHomePage`/`DialogVistaPrevia`), reenviado tal cual a
   * `DialogContent` para que el modal monte dentro del árbol con las
   * variables CSS del tema y la clase `dark`, en vez de como hermano de
   * `document.body`. `undefined`/`null` cae al default de Radix
   * (`document.body`).
   */
  container?: Element | DocumentFragment | null
}

/**
 * Modal casi a pantalla completa para el detalle de un proyecto/
 * certificación/logro abierto desde una tarjeta de la home (Fase 4.3, UC-13)
 * — mismo patrón que `DialogVistaPrevia` (`h-[90vh]`, `sm:max-w-[95vw]`).
 * `DialogTitle`/`DialogDescription` quedan ocultos visualmente (`sr-only`):
 * el propio `children` (un `Detalle*Contenido`) ya trae su propio `<h1>`
 * visible, pero Radix exige un título/descripción accesibles en todo
 * `DialogContent`.
 *
 * Scrollbar delgada coloreada con el tema (fix 5ta ronda), NO oculta: a
 * diferencia del carousel de Galería (ronda anterior), que sí la oculta
 * porque ya tiene flechas/dots como navegación alternativa, este modal de
 * detalle puede tener contenido largo y la scrollbar es la única señal de
 * que hay más para scrollear.
 */
export function DialogDetalle({ open, onOpenChange, children, container }: DialogDetalleProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={container}
        className="flex h-[90vh] flex-col overflow-y-auto sm:max-w-[95vw] [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Detalle</DialogTitle>
          <DialogDescription>Detalle del elemento seleccionado.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
