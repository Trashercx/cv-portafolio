import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Última ruta pública en la que se montó un `<main>` (Fase 6, accesibilidad).
 * Sirve para NO robar el foco en la carga inicial (el primer Tab debe caer
 * en el skip link) y moverlo solo cuando el visitante navega a otra ruta.
 */
let ultimaRuta: string | null = null

/** Solo para tests: olvida la ruta previa. */
export function reiniciarSeguimientoDeFoco() {
  ultimaRuta = null
}

/** Enlace «Saltar al contenido»: visible solo con foco, primer elemento focusable. */
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
    >
      Saltar al contenido
    </a>
  )
}

/**
 * `<main id="contenido">` del sitio público (Fase 6, UC-12/UC-13): destino
 * del skip link y, al cambiar de ruta pública, recibe el foco
 * (`tabIndex={-1}` + `focus({ preventScroll: true })`) para que los lectores
 * de pantalla anuncien el nuevo contenido. El header/nav y el footer quedan
 * fuera de este elemento.
 */
export function ContenidoPrincipal({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { pathname } = useLocation()
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const previa = ultimaRuta
    ultimaRuta = pathname
    if (previa !== null && previa !== pathname) {
      ref.current?.focus({ preventScroll: true })
    }
  }, [pathname])

  return (
    <main
      id="contenido"
      ref={ref}
      tabIndex={-1}
      className={cn('outline-none', className)}
    >
      {children}
    </main>
  )
}
