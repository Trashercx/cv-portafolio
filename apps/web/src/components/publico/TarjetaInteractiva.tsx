import type { PointerEvent, ReactNode } from 'react'
import { m, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { EfectoHoverTarjeta } from '@/features/secciones/types'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { EFECTO_HOVER_CLASE, INCLINACION_MAXIMA_GRADOS } from '@/lib/efectos-hover'
import { cn } from '@/lib/utils'
import { ProveedorMotion } from './ProveedorMotion'

type TarjetaInteractivaProps = {
  /** `efecto_hover` del bloque. `undefined` = `'elevar'` (default del API). */
  efecto?: EfectoHoverTarjeta
  /** Clases del contenedor (también el lugar para las de grid: `col-span-*`, etc.). */
  className?: string
  children: ReactNode
}

/**
 * Contenedor que aplica `efecto_hover` a una tarjeta (Fase 7, 7.3, UC-12):
 * `elevar` = sube 4 px con sombra grande (CSS), `inclinar` = tilt 3D sutil
 * (máx. `INCLINACION_MAXIMA_GRADOS`) que sigue al cursor con `motion`. Se
 * comporta igual en el sitio público y en el lienzo del editor (el hover sí
 * se anima en Puck). `inclinar` se degrada a solo sombra con
 * `prefers-reduced-motion` y se ignora en punteros táctiles.
 */
export function TarjetaInteractiva({ efecto, className, children }: TarjetaInteractivaProps) {
  const reducido = usePrefiereMovimientoReducido()
  const efectivo = efecto ?? 'elevar'

  if (efectivo === 'inclinar' && !reducido) {
    return <TarjetaInclinable className={className}>{children}</TarjetaInclinable>
  }

  return (
    <div
      data-efecto-hover={efectivo}
      className={cn(
        'rounded-lg',
        // Con movimiento reducido, `inclinar` queda en solo sombra (sin tilt).
        EFECTO_HOVER_CLASE[efectivo],
        className,
      )}
    >
      {children}
    </div>
  )
}

function TarjetaInclinable({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(
    useTransform(y, [-0.5, 0.5], [INCLINACION_MAXIMA_GRADOS, -INCLINACION_MAXIMA_GRADOS]),
    { stiffness: 220, damping: 22 },
  )
  const rotateY = useSpring(
    useTransform(x, [-0.5, 0.5], [-INCLINACION_MAXIMA_GRADOS, INCLINACION_MAXIMA_GRADOS]),
    { stiffness: 220, damping: 22 },
  )

  function alMover(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return
    const caja = event.currentTarget.getBoundingClientRect()
    if (caja.width === 0 || caja.height === 0) return
    x.set((event.clientX - caja.left) / caja.width - 0.5)
    y.set((event.clientY - caja.top) / caja.height - 0.5)
  }

  function alSalir() {
    x.set(0)
    y.set(0)
  }

  // Los `MotionValue` de `style` solo se pintan dentro de un `LazyMotion`:
  // un proveedor local (barato, `domAnimation` ya está cargado) evita que el
  // tilt dependa de que el ancestro lo haya montado.
  return (
    <ProveedorMotion>
      <m.div
        data-efecto-hover="inclinar"
        onPointerMove={alMover}
        onPointerLeave={alSalir}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        className={cn('rounded-lg', EFECTO_HOVER_CLASE.inclinar, className)}
      >
        {children}
      </m.div>
    </ProveedorMotion>
  )
}
