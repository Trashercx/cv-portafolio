import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type VarianteChip = 'neutro' | 'primario' | 'exito' | 'aviso'

/**
 * Fase 7l (UC-02, UC-04, UC-35): colores del chip, solo de variables del tema
 * (`--color-primario`/`--color-secundario` del tema activo y `--destructive`/
 * `--foreground` de shadcn). El texto mezcla el color con `--foreground` para
 * conservar el contraste con cualquier paleta. Tabla literal (Tailwind no ve
 * clases armadas en runtime).
 */
const VARIANTE_CHIP_CLASE: Record<VarianteChip, string> = {
  neutro: 'bg-muted text-muted-foreground',
  primario:
    'bg-[color-mix(in_oklab,var(--color-primario)_14%,transparent)] text-[color-mix(in_oklab,var(--color-primario)_75%,var(--foreground))]',
  exito:
    'bg-[color-mix(in_oklab,var(--color-secundario)_16%,transparent)] text-[color-mix(in_oklab,var(--color-secundario)_70%,var(--foreground))]',
  aviso:
    'bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]',
}

type ChipProps = {
  variante?: VarianteChip
  className?: string
  children: ReactNode
  /** `true` cuando el chip es un `<li>` de una lista (tecnologías). */
  comoItem?: boolean
}

/** Chip pequeño y redondeado compartido por proyectos, certificaciones y experiencia. */
export function Chip({ variante = 'neutro', className, children, comoItem = false }: ChipProps) {
  const Etiqueta = comoItem ? 'li' : 'span'
  return (
    <Etiqueta
      data-chip={variante}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANTE_CHIP_CLASE[variante],
        className,
      )}
    >
      {children}
    </Etiqueta>
  )
}
