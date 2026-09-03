import type { ReactNode } from 'react'

type EnvoltorioSeccionProps = {
  /** `Seccion.id`, cuando ya existe (ausente para un bloque recién arrastrado en el lienzo del editor, todavía sin guardar). */
  id?: string
  visible: boolean
  children: ReactNode
}

/**
 * Envoltorio visual (espaciado + aviso "Oculta") de cada sección, extraído de
 * `RenderizadorSecciones` para que lo compartan **ambos** consumidores: el
 * sitio público (vía `RenderizadorSecciones`) y el lienzo del editor de Puck
 * (vía cada `render` de `puck-config.tsx`). Compartir este componente en vez
 * de duplicar sus clases es lo que garantiza que el espaciado del lienzo sea
 * idéntico al del sitio público por construcción, no por copiar clases a
 * mano en dos lugares.
 */
export function EnvoltorioSeccion({
  id,
  visible,
  children,
}: EnvoltorioSeccionProps) {
  return (
    <section
      id={id}
      aria-hidden={!visible}
      className={
        visible
          ? 'border-b px-6 py-12'
          : 'border-b border-dashed px-6 py-12 opacity-40'
      }
    >
      {!visible ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Oculta · no se publicará
        </p>
      ) : null}
      {children}
    </section>
  )
}
