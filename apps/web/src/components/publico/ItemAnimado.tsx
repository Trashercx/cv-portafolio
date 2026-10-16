import type { ReactNode } from 'react'
import { m } from 'motion/react'
import {
  VARIANTES_ENTRADA,
  VIEWPORT_ITEM,
  escalonado,
  useAnimacionesActivas,
} from '@/lib/animaciones'

type ItemAnimadoProps = {
  /** Posición en la lista: define el retraso escalonado (`escalonado`). */
  indice: number
  className?: string
  children: ReactNode
  /** Fase 7j: animación del ítem (por defecto `deslizar_arriba`, la de siempre). */
  variante?: keyof typeof VARIANTES_ENTRADA
}

/**
 * Ítem de una lista (tarjeta, estadística, chip) que se revela escalonado al
 * entrar en el viewport (Fase 7, 7.3, UC-12). Sin animación (movimiento
 * reducido o lienzo del editor) es un `div` plano.
 */
export function ItemAnimado({
  indice,
  className,
  children,
  variante: clave = 'deslizar_arriba',
}: ItemAnimadoProps) {
  const activa = useAnimacionesActivas()
  const variante = VARIANTES_ENTRADA[clave]

  if (!activa) return <div className={className}>{children}</div>

  return (
    <m.div
      initial={variante.initial}
      whileInView={variante.whileInView}
      viewport={VIEWPORT_ITEM}
      transition={{ ...variante.transition, delay: escalonado(indice) }}
      className={className}
    >
      {children}
    </m.div>
  )
}
