import { useEffect, useRef, type RefObject } from 'react'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'

/**
 * Progreso de scroll del documento (Fase 7b, UC-15): `valor` es `scrollY`
 * en píxeles y `progreso` va de 0 a 1 sobre el recorrido total. Mismo
 * criterio que `usePunteroRelativo`: listener pasivo acoplado a rAF, inactivo
 * con `activo=false` o `prefers-reduced-motion`, y sin renders de React.
 */
export function useScrollRelativo(
  ref: RefObject<HTMLElement | null>,
  activo: boolean,
  alScroll: (estado: { valor: number; progreso: number }) => void,
) {
  const reducido = usePrefiereMovimientoReducido()
  const callback = useRef(alScroll)
  useEffect(() => {
    callback.current = alScroll
  })

  useEffect(() => {
    const el = ref.current
    if (!activo || reducido || !el) return
    const doc = el.ownerDocument
    const ventana = doc.defaultView ?? window
    let cuadro = 0

    const aplicar = () => {
      cuadro = 0
      const raiz = doc.documentElement
      const recorrido = Math.max(1, raiz.scrollHeight - ventana.innerHeight)
      const valor = ventana.scrollY
      callback.current({ valor, progreso: Math.min(1, Math.max(0, valor / recorrido)) })
    }
    const alHacerScroll = () => {
      if (!cuadro) cuadro = ventana.requestAnimationFrame(aplicar)
    }

    ventana.addEventListener('scroll', alHacerScroll, { passive: true })
    return () => {
      ventana.removeEventListener('scroll', alHacerScroll)
      if (cuadro) ventana.cancelAnimationFrame(cuadro)
    }
  }, [ref, activo, reducido])
}
