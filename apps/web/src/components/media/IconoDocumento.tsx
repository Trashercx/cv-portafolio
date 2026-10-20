import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconoDocumentoProps = {
  /**
   * Clases adicionales, mergeadas con `cn()` sobre el tamaño default del
   * círculo (`size-10`) — libre en vez de una escala cerrada (a diferencia
   * de `IconoSkill` en `features/skills/iconos-skill.tsx`), porque acá
   * alcanza con ajustar el tamaño puntual de cada consumidor.
   */
  className?: string
  /** Tamaño del glifo `FileText` en sí, independiente del círculo que lo envuelve. */
  iconoClassName?: string
}

/**
 * Insignia circular roja con un ícono de documento (`FileText`), para
 * miniaturas de archivos no-imagen (PDFs de certificados/CV). Extraída de
 * `MediaPreview.tsx` (fix 5ta ronda) para reusarse también en
 * `BloqueCertificaciones.tsx`, sin duplicar el mismo círculo
 * + glifo `text-destructive` en dos lugares.
 */
export function IconoDocumento({ className, iconoClassName }: IconoDocumentoProps) {
  return (
    <span
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10',
        className,
      )}
    >
      <FileText className={cn('size-5 text-destructive', iconoClassName)} aria-hidden="true" />
    </span>
  )
}
