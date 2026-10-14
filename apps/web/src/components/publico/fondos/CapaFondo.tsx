import type { CSSProperties, ReactNode, Ref } from 'react'
import type { PropsFondoVisual } from './utilidades'

type CapaFondoProps = {
  ambito: PropsFondoVisual['ambito']
  capaRef?: Ref<HTMLDivElement>
  style?: CSSProperties
  children: ReactNode
}

/**
 * Capa visual de un fondo (Fase 7b, UC-15). En el ámbito `pagina` (sitio y
 * lienzo del editor) se ancla al viewport con `fixed`: el contenedor de
 * `FondoAnimado` mide toda la página y un canvas o una rejilla de ese alto
 * serían enormes; así los efectos son del tamaño de la ventana y el
 * parallax de puntero/scroll tiene una referencia estable. En el ámbito
 * `caja` (miniaturas, vista previa del panel) solo ocupa su contenedor.
 * Las clases son literales a propósito (Tailwind no ve las concatenadas).
 */
export function CapaFondo({ ambito, capaRef, style, children }: CapaFondoProps) {
  return (
    <div
      ref={capaRef}
      style={style}
      className={
        ambito === 'pagina'
          ? 'pointer-events-none fixed inset-0 overflow-hidden'
          : 'pointer-events-none absolute inset-0 overflow-hidden'
      }
    >
      {children}
    </div>
  )
}
