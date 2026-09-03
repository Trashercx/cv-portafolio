import type { ReactNode } from 'react'
import {
  ANCHO_CONTENIDO_CLASE,
  ESPACIADO_VERTICAL_CLASE,
  FONDO_BLOQUE_CLASE,
} from '@/lib/escalas-bloque'
import { cn } from '@/lib/utils'
import type {
  AnchoContenidoBloque,
  EspaciadoVerticalBloque,
  FondoBloqueBloque,
} from '@/features/secciones/types'

type EnvoltorioSeccionProps = {
  /** `Seccion.id`, cuando ya existe (ausente para un bloque recién arrastrado en el lienzo del editor, todavía sin guardar). */
  id?: string
  visible: boolean
  /**
   * Los 4 campos de `BloqueConfiguracionBase` (Fase 3.4) que le tocan a este
   * componente — `alineacion_texto` NO se maneja acá: solo controla la
   * alineación del `<h2>` de cada `Bloque*.tsx`, así que cada uno la aplica
   * a su propio título (ver `ALINEACION_TEXTO_CLASE`). Todos opcionales:
   * `undefined` (sección guardada antes de esta fase) usa el mismo default
   * documentado en `escalas-bloque.ts`, que preserva el aspecto visual que
   * el código ya tenía hardcodeado.
   */
  espaciado_vertical?: EspaciadoVerticalBloque
  ancho_contenido?: AnchoContenidoBloque
  fondo_bloque?: FondoBloqueBloque
  separador_inferior?: boolean
  children: ReactNode
}

/**
 * Envoltorio visual (espaciado/ancho/fondo/separador + aviso "Oculta") de
 * cada sección, extraído de `RenderizadorSecciones` para que lo compartan
 * **ambos** consumidores: el sitio público (vía `RenderizadorSecciones`) y
 * el lienzo del editor de Puck (vía cada `render` de `puck-config.tsx`).
 * Compartir este componente en vez de duplicar sus clases es lo que
 * garantiza que el espaciado del lienzo sea idéntico al del sitio público
 * por construcción, no por copiar clases a mano en dos lugares.
 *
 * Fase 3.4: pasa de un `<section>` con clases fijas a componer las 4 clases
 * de `escalas-bloque.ts` (único lugar token → clase Tailwind literal) más un
 * `<div>` interno `mx-auto` + `ancho_contenido` que envuelve `children` — así
 * cada uno de los 8 `Bloque*.tsx` deja de necesitar su propio `mx-auto
 * max-w-*` hardcodeado (lo tenían duplicado, ver commits previos a esta
 * fase).
 */
export function EnvoltorioSeccion({
  id,
  visible,
  espaciado_vertical,
  ancho_contenido,
  fondo_bloque,
  separador_inferior,
  children,
}: EnvoltorioSeccionProps) {
  const separador = separador_inferior ?? true

  return (
    <section
      id={id}
      aria-hidden={!visible}
      className={cn(
        'px-6',
        ESPACIADO_VERTICAL_CLASE[espaciado_vertical ?? 'normal'],
        FONDO_BLOQUE_CLASE[fondo_bloque ?? 'ninguno'],
        separador && (visible ? 'border-b' : 'border-b border-dashed'),
        !visible && 'opacity-40',
      )}
    >
      {!visible ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Oculta · no se publicará
        </p>
      ) : null}
      <div className={cn('mx-auto', ANCHO_CONTENIDO_CLASE[ancho_contenido ?? 'normal'])}>
        {children}
      </div>
    </section>
  )
}
