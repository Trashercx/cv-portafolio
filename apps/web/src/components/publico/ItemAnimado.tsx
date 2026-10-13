import type { ReactNode } from 'react'
import { m } from 'motion/react'
import {
  VARIANTES_ENTRADA,
  VIEWPORT_ENTRADA,
  escalonado,
  useAnimacionesActivas,
} from '@/lib/animaciones'

type ItemAnimadoProps = {
  /** Posición en la lista: define el retraso escalonado (`escalonado`). */
  indice: number
  className?: string
  children: ReactNode
}

/**
 * Ítem de una lista (tarjeta, estadística, chip) que se revela escalonado al
 * entrar en el viewport (Fase 7, 7.3, UC-12). Sin animación (movimiento
 * reducido o lienzo del editor) es un `div` plano.
 */
export function ItemAnimado({ indice, className, children }: ItemAnimadoProps) {
  const activa = useAnimacionesActivas()
  const variante = VARIANTES_ENTRADA.deslizar_arriba

  if (!activa) return <div className={className}>{children}</div>

  return (
    <m.div
      initial={variante.initial}
      whileInView={variante.whileInView}
      viewport={VIEWPORT_ENTRADA}
      transition={{ ...variante.transition, delay: escalonado(indice) }}
      className={className}
    >
      {children}
    </m.div>
  )
}
