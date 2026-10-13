import type { ReactNode } from 'react'
import { LazyMotion, domAnimation } from 'motion/react'

/**
 * Proveedor único de `motion` (Fase 7, 7.3, UC-12): `LazyMotion` con el
 * paquete `domAnimation` (animaciones, variantes, hover, `whileInView`; sin
 * drag ni layout) y componentes `m.*` en lugar de `motion.*`, para que el
 * bundle de motion quede en ~15 kB. Se monta en `PublicHomePage`,
 * `RenderizadorSecciones` (también lo usa la vista previa del panel) y
 * `PuckRoot` (lienzo). Fuera de un proveedor los `m.*` se renderizan
 * estáticos, sin animación y sin romper.
 */
export function ProveedorMotion({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>
}
