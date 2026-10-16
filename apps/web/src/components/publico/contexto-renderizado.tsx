import { createContext, useContext, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type ModoRenderizado = 'publico' | 'editor'

/**
 * Distingue si `RenderizadorSecciones`/los bloques de `bloques/` se están
 * pintando en el sitio público real (UC-12, navegación normal) o dentro del
 * lienzo del editor de Puck (Fase 3.1, `PuckRoot`). El default es `'publico'`
 * a propósito: `RenderizadorSecciones` (usado también por `PanelVersiones`,
 * que sí navega normalmente en la vista previa dentro de un `Dialog` del
 * panel) no necesita envolverse en `ProveedorModoRenderizado` para conservar
 * su comportamiento actual — solo el lienzo de Puck (que vive dentro de un
 * `<Router>` real vía `createPortal`, ver notas de Fase 3.1) necesita anular
 * la navegación real de los enlaces.
 */
const ContextoModoRenderizado = createContext<ModoRenderizado>('publico')

export function ProveedorModoRenderizado({
  modo,
  children,
}: {
  modo: ModoRenderizado
  children: ReactNode
}) {
  return (
    <ContextoModoRenderizado.Provider value={modo}>
      {children}
    </ContextoModoRenderizado.Provider>
  )
}

export function useModoRenderizado(): ModoRenderizado {
  return useContext(ContextoModoRenderizado)
}

/**
 * Fase 7c (UC-07): `true` cuando el lienzo del editor está en "Vista limpia".
 * `PuckRoot` lo provee a partir de `editor-panel-store`; `EnvoltorioSeccion`
 * lo lee para dejar de pintar las secciones ocultas (el sitio público nunca
 * lo provee: default `false`).
 */
const ContextoVistaLimpia = createContext(false)

export function ProveedorVistaLimpia({
  activa,
  children,
}: {
  activa: boolean
  children: ReactNode
}) {
  return <ContextoVistaLimpia.Provider value={activa}>{children}</ContextoVistaLimpia.Provider>
}

export function useVistaLimpia(): boolean {
  return useContext(ContextoVistaLimpia)
}

/**
 * Fase 7j (UC-17): `true` para los bloques pintados dentro de una columna de
 * `columnas`. Lo proveen `BloqueColumnas` (sitio) y el render del bloque
 * `columnas` en Puck (lienzo); la portada lo lee para adaptar alto y
 * tipografía al ancho de la columna.
 */
const ContextoEnColumna = createContext(false)

export function ProveedorEnColumna({ children }: { children: ReactNode }) {
  return <ContextoEnColumna.Provider value>{children}</ContextoEnColumna.Provider>
}

export function useEnColumna(): boolean {
  return useContext(ContextoEnColumna)
}

type EnlaceBloqueProps = {
  /** Ruta interna (react-router). Mutuamente excluyente con `href`. */
  to?: string
  /** URL externa o absoluta. Mutuamente excluyente con `to`. */
  href?: string
  target?: string
  rel?: string
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
  /** Fase 7 (navegación): `aria-current` del enlace de la sección activa. */
  'aria-current'?: 'location' | 'page' | 'true'
  /** Fase 7 (navegación): se ignora en modo `'editor'`, donde el enlace es inerte. */
  onClick?: () => void
  children: ReactNode
}

/**
 * Enlace usado por los bloques de `bloques/` y por `RedesSociales` en vez de
 * `<Link>`/`<a>` directo. En modo `'publico'` navega normalmente; en modo
 * `'editor'` (lienzo de Puck) renderiza un `<div role="link"
 * aria-disabled="true">` con el mismo `className`/`style` — el `Router` de
 * react-router sigue disponible dentro del iframe de Puck (`createPortal`
 * conserva el árbol de contexto de React), así que un `<Link>`/`<a>` real
 * navegaría fuera del editor si no se intercepta acá.
 */
export function EnlaceBloque({
  to,
  href,
  target,
  rel,
  children,
  onClick,
  ...resto
}: EnlaceBloqueProps) {
  const modo = useModoRenderizado()

  if (modo === 'editor') {
    return (
      <div role="link" aria-disabled="true" {...resto}>
        {children}
      </div>
    )
  }

  if (to) {
    return (
      <Link to={to} onClick={onClick} {...resto}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} target={target} rel={rel} onClick={onClick} {...resto}>
      {children}
    </a>
  )
}

type TarjetaClicableProps = {
  /** Handler de click, ignorado en modo `'editor'`. */
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
  children: ReactNode
}

/**
 * Igual criterio que `EnlaceBloque`, pero para tarjetas que abren un modal
 * de detalle (Fase 4.3, `ProveedorDetallePublico`) en vez de navegar a una
 * URL propia: en modo `'editor'` sigue siendo un `<div role="link"
 * aria-disabled="true">` inerte (idéntico a como se veía antes de esta
 * fase, para no cambiar el comportamiento del lienzo de Puck); en modo
 * `'publico'` es un `<button type="button">` real (accesible por teclado
 * out-of-the-box) que dispara `onClick`.
 */
export function TarjetaClicable({ onClick, children, ...resto }: TarjetaClicableProps) {
  const modo = useModoRenderizado()

  if (modo === 'editor') {
    return (
      <div role="link" aria-disabled="true" {...resto}>
        {children}
      </div>
    )
  }

  return (
    <button type="button" onClick={onClick} {...resto}>
      {children}
    </button>
  )
}
