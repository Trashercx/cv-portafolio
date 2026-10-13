import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Fallback de `Suspense` para las páginas cargadas con `React.lazy`
 * (Fase 6, code splitting): un bloque `Skeleton` centrado y discreto que usa
 * los tokens del tema (`bg-accent`), sin colores propios. `className` permite
 * reducir la altura dentro del panel admin (donde el layout ya está pintado).
 */
export function CargandoPagina({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-svh items-center justify-center p-4',
        className,
      )}
    >
      <Skeleton className="h-8 w-48" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
