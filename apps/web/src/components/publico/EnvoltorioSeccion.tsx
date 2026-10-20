import type { CSSProperties, ReactNode } from 'react'
import { m } from 'motion/react'
import {
  ANCHO_CONTENIDO_CLASE,
  BORDE_BLOQUE_VARIABLES,
  ESPACIADO_VERTICAL_CLASE,
  FONDO_BLOQUE_CLASE,
  SEPARADOR_FORMA_TRAZO,
  SEPARADOR_RELLENO_CLASE,
} from '@/lib/escalas-bloque'
import { VARIANTES_ENTRADA, VIEWPORT_ENTRADA, useAnimacionesActivas } from '@/lib/animaciones'
import { useVistaLimpia } from './contexto-renderizado'
import { anclaSeccion } from '@/lib/navegacion'
import { cn } from '@/lib/utils'
import type {
  AnchoContenidoBloque,
  AnimacionEntradaBloque,
  BordeBloqueBloque,
  EspaciadoVerticalBloque,
  FondoBloqueBloque,
  SeparadorFormaBloque,
} from '@/features/secciones/types'

type EnvoltorioSeccionProps = {
  /**
   * `Seccion.id`, cuando ya existe (ausente para un bloque recién arrastrado
   * en el lienzo del editor, todavía sin guardar). Fase 7: el DOM recibe
   * `id="seccion-{id}"` (ver `anclaSeccion`), destino de la navegación.
   */
  id?: string
  visible: boolean
  /**
   * Los campos de `BloqueConfiguracionBase` que le tocan a este componente —
   * `alineacion_texto` NO se maneja acá: solo controla la alineación del
   * `<h2>` de cada `Bloque*.tsx`, así que cada uno la aplica a su propio
   * título (ver `ALINEACION_TEXTO_CLASE`). Todos opcionales: `undefined`
   * (sección guardada antes de esta fase) usa el mismo default documentado
   * en `escalas-bloque.ts`, que preserva el aspecto visual que el código ya
   * tenía hardcodeado.
   */
  espaciado_vertical?: EspaciadoVerticalBloque
  ancho_contenido?: AnchoContenidoBloque
  fondo_bloque?: FondoBloqueBloque
  separador_inferior?: boolean
  /** Fase 7 (7.2, UC-12). `undefined` = `'aparecer'` (default del API). */
  animacion_entrada?: AnimacionEntradaBloque
  /** Fase 7 (7.2, UC-12). `undefined` = `'ninguno'`. */
  separador_forma?: SeparadorFormaBloque
  /** Fase 7c (UC-12). `undefined` = `'sutil'` (snapshots anteriores a la fase). */
  borde_bloque?: BordeBloqueBloque
  /**
   * Fase 7m (Lighthouse): en el sitio público las secciones que quedan bajo el
   * pliegue se pintan con `content-visibility: auto`, así el navegador no
   * calcula estilo ni layout de lo que no se ve hasta acercarse. Solo lo activa
   * `RenderizadorSecciones`; el lienzo del editor nunca lo usa.
   */
  diferirPintado?: boolean
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
 * Fase 3.4: compone las clases de `escalas-bloque.ts` (único lugar token →
 * clase Tailwind literal) más un `<div>` interno `mx-auto` + `ancho_contenido`
 * que envuelve `children`.
 *
 * Fase 7 (7.3, UC-12): `id="seccion-{id}"` + `scroll-mt-24` (ancla de la
 * navegación), `animacion_entrada` con `m.section` (una sola vez al entrar en
 * el viewport; desactivada en el lienzo del editor y con movimiento
 * reducido, ver `useAnimacionesActivas`), `separador_forma` como SVG al pie
 * y los fondos `degradado`/`vidrio` (en `FONDO_BLOQUE_CLASE`).
 */
/**
 * Fase 7m (Lighthouse): `contain-intrinsic-size` reserva una altura estimada
 * mientras la sección no se ha pintado, para que la barra de scroll no salte.
 */
const CLASE_PINTADO_DIFERIDO = '[content-visibility:auto] [contain-intrinsic-size:auto_600px]'

export function EnvoltorioSeccion({
  id,
  visible,
  espaciado_vertical,
  ancho_contenido,
  fondo_bloque,
  separador_inferior,
  animacion_entrada,
  separador_forma,
  borde_bloque,
  diferirPintado = false,
  children,
}: EnvoltorioSeccionProps) {
  const vistaLimpia = useVistaLimpia()
  const forma = separador_forma ?? 'ninguno'
  // Con una forma decorativa al pie, la línea recta del borde sobraría.
  const separador = (separador_inferior ?? true) && forma === 'ninguno'
  const animacionActiva = useAnimacionesActivas()
  const entrada = animacion_entrada ?? 'aparecer'
  // Una sección oculta se ve atenuada (`opacity-40`): una animación de
  // opacidad inline la pisaría, así que solo se anima lo visible.
  const variante =
    animacionActiva && visible && entrada !== 'ninguna' ? VARIANTES_ENTRADA[entrada] : null

  // Vista limpia (Fase 7c, UC-07): lo oculto desaparece del todo, como en el sitio público.
  if (!visible && vistaLimpia) return null

  return (
    <m.section
      id={id ? anclaSeccion(id) : undefined}
      aria-hidden={!visible}
      // Fase 7c (UC-12): contorno opcional vía variables CSS que leen los contenedores y tarjetas del bloque.
      style={BORDE_BLOQUE_VARIABLES[borde_bloque ?? 'sutil'] as CSSProperties}
      initial={variante?.initial}
      whileInView={variante?.whileInView}
      transition={variante?.transition}
      viewport={variante ? VIEWPORT_ENTRADA : undefined}
      className={cn(
        'relative scroll-mt-24 px-6',
        ESPACIADO_VERTICAL_CLASE[espaciado_vertical ?? 'normal'],
        FONDO_BLOQUE_CLASE[fondo_bloque ?? 'ninguno'],
        separador && (visible ? 'border-b' : 'border-b border-dashed'),
        !visible && 'opacity-40',
        diferirPintado && CLASE_PINTADO_DIFERIDO,
      )}
    >
      {forma !== 'ninguno' ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          data-separador={forma}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full"
        >
          <path d={SEPARADOR_FORMA_TRAZO[forma]} className={SEPARADOR_RELLENO_CLASE} />
        </svg>
      ) : null}
      {!visible ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Oculta · no se publicará
        </p>
      ) : null}
      <div
        className={cn('relative mx-auto', ANCHO_CONTENIDO_CLASE[ancho_contenido ?? 'normal'])}
      >
        {children}
      </div>
    </m.section>
  )
}
