import { useEffect, useRef, type RefObject } from 'react'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'

/**
 * Posición del puntero relativa al elemento observado (Fase 7b, UC-15).
 * `x`/`y` van de 0 a 1 (pueden salirse del rango si el puntero está fuera);
 * `px`/`py` son píxeles CSS desde la esquina superior izquierda.
 */
export type PosicionPuntero = { x: number; y: number; px: number; py: number }

/**
 * Escucha `pointermove` (pasivo) en la ventana del documento del elemento y
 * avisa a `alMover` como máximo una vez por fotograma (acoplado a rAF), así un
 * ratón de 1000 Hz no dispara trabajo extra. El contenedor del fondo es
 * `pointer-events-none`, por eso se escucha en la ventana y se calcula contra
 * `getBoundingClientRect()` del elemento. `alMover(null)` indica que el
 * puntero salió del documento.
 *
 * Inactivo (no registra nada) con `activo=false`, con `prefers-reduced-motion`
 * y con `(hover: none)` (táctil: no hay puntero que seguir). `alMover` no
 * provoca renders: los fondos escriben variables CSS o refs.
 */
export function usePunteroRelativo(
  ref: RefObject<HTMLElement | null>,
  activo: boolean,
  alMover: (posicion: PosicionPuntero | null) => void,
) {
  const reducido = usePrefiereMovimientoReducido()
  const callback = useRef(alMover)
  useEffect(() => {
    callback.current = alMover
  })

  useEffect(() => {
    const el = ref.current
    if (!activo || reducido || !el) return
    const ventana = el.ownerDocument.defaultView ?? window
    if (ventana.matchMedia?.('(hover: none)').matches) return

    let cuadro = 0
    let ultimo: { x: number; y: number } | null = null

    const aplicar = () => {
      cuadro = 0
      if (!ultimo) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const px = ultimo.x - rect.left
      const py = ultimo.y - rect.top
      callback.current({ x: px / rect.width, y: py / rect.height, px, py })
    }
    const alMoverPuntero = (evento: PointerEvent) => {
      ultimo = { x: evento.clientX, y: evento.clientY }
      if (!cuadro) cuadro = ventana.requestAnimationFrame(aplicar)
    }
    const alSalir = () => {
      ultimo = null
      callback.current(null)
    }

    ventana.addEventListener('pointermove', alMoverPuntero, { passive: true })
    el.ownerDocument.documentElement.addEventListener('pointerleave', alSalir)
    return () => {
      ventana.removeEventListener('pointermove', alMoverPuntero)
      el.ownerDocument.documentElement.removeEventListener('pointerleave', alSalir)
      if (cuadro) ventana.cancelAnimationFrame(cuadro)
    }
  }, [ref, activo, reducido])
}
