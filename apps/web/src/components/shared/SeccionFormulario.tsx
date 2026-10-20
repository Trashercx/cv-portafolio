import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SeccionFormularioProps = {
  titulo: string
  descripcion?: string
  className?: string
  children: ReactNode
}

/**
 * Fase 7m (#68), UC-02…UC-06, UC-19, UC-35: agrupa los campos de un
 * formulario del panel bajo un título ("Datos", "Fechas", "Enlaces",
 * "Imagen"…) con una descripción opcional. Es un `fieldset` con `legend`, así
 * que los lectores de pantalla anuncian el grupo; los hijos van en una
 * cuadrícula de una columna (los campos que van en pareja traen su propio
 * `grid-cols-2`).
 */
export function SeccionFormulario({ titulo, descripcion, className, children }: SeccionFormularioProps) {
  return (
    <fieldset className={cn('grid min-w-0 gap-4 rounded-lg border p-4', className)}>
      <legend className="px-1 text-sm font-semibold">{titulo}</legend>
      {descripcion ? <p className="-mt-2 text-xs text-muted-foreground">{descripcion}</p> : null}
      {children}
    </fieldset>
  )
}
