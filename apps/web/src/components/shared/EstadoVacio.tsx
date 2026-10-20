import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EstadoVacioProps = {
  /** Icono de lucide-react (decorativo). */
  icono: LucideIcon
  titulo: string
  descripcion?: string
  /** Texto del botón de la llamada a la acción; sin él (o sin `onAccion`) no se muestra botón. */
  etiquetaAccion?: string
  onAccion?: () => void
  className?: string
}

/**
 * Fase 7m (#68), UC-02…UC-06, UC-19, UC-35: estado vacío común de los
 * listados del panel — icono, título, texto de ayuda y un botón que lleva a la
 * acción que llena la lista (crear, importar…).
 */
export function EstadoVacio({
  icono: Icono,
  titulo,
  descripcion,
  etiquetaAccion,
  onAccion,
  className,
}: EstadoVacioProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icono className="size-6" aria-hidden="true" />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">{titulo}</p>
        {descripcion ? <p className="text-sm text-muted-foreground">{descripcion}</p> : null}
      </div>
      {etiquetaAccion && onAccion ? (
        <Button type="button" onClick={onAccion}>
          {etiquetaAccion}
        </Button>
      ) : null}
    </div>
  )
}
