import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import {
  entradaCatalogo,
  normalizarTipoFondo,
  type TipoFondo,
} from '@/features/fondo-sitio/catalogo-fondos'
import type { IntensidadFondo, VelocidadFondo } from '@/features/fondo-sitio/types'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { cn } from '@/lib/utils'
import type { PropsFondoVisual } from './fondos/utilidades'

/** Dónde se dibuja el fondo (Fase 7b, UC-15). */
export type ModoFondo = 'sitio' | 'editor' | 'miniatura'

export type FondoAnimadoProps = {
  /** Estructuralmente compatible con `FondoSitio` y con el `fondo` del snapshot (que puede traer tipos antiguos ya publicados). */
  fondo: {
    tipo: string
    configuracion: {
      velocidad?: string
      opacidad?: number
      intensidad?: string
      interactivo?: boolean
    }
  }
  /**
   * `sitio` (default): todo activo. `editor` (iframe del lienzo): animación CSS
   * sí, interactividad no, canvas a 30 fps como máximo. `miniatura`: sin
   * `requestAnimationFrame` ni interactividad, animación CSS solo al pasar el
   * puntero por la tarjeta (`.tarjeta-fondo`, ver `index.css`).
   */
  modo?: ModoFondo
  /** Anclaje de la capa visual; por defecto `pagina` (sitio/editor) y `caja` (miniatura). */
  ambito?: PropsFondoVisual['ambito']
}

type FondoLazy = LazyExoticComponent<ComponentType<PropsFondoVisual>>

/**
 * Un chunk por tipo (Fase 7b, UC-15): ni los canvas ni el CSS de cada fondo
 * engordan el bundle inicial; solo se descarga el del fondo activo.
 */
const FONDOS: Record<Exclude<TipoFondo, 'solido'>, FondoLazy> = {
  aurora_mesh: lazy(() => import('./fondos/AuroraMesh').then((m) => ({ default: m.AuroraMesh }))),
  malla_puntos: lazy(() => import('./fondos/MallaPuntos').then((m) => ({ default: m.MallaPuntos }))),
  rejilla_perspectiva: lazy(() =>
    import('./fondos/RejillaPerspectiva').then((m) => ({ default: m.RejillaPerspectiva })),
  ),
  particulas_red: lazy(() => import('./fondos/ParticulasRed').then((m) => ({ default: m.ParticulasRed }))),
  ondas_fluidas: lazy(() => import('./fondos/OndasFluidas').then((m) => ({ default: m.OndasFluidas }))),
  haces_luz: lazy(() => import('./fondos/HacesLuz').then((m) => ({ default: m.HacesLuz }))),
  degradado_grano: lazy(() => import('./fondos/DegradadoGrano').then((m) => ({ default: m.DegradadoGrano }))),
  campo_estrellas: lazy(() => import('./fondos/CampoEstrellas').then((m) => ({ default: m.CampoEstrellas }))),
}

const VELOCIDADES: readonly VelocidadFondo[] = ['lenta', 'media', 'rapida']
const INTENSIDADES: readonly IntensidadFondo[] = ['sutil', 'media', 'alta']

/**
 * Fondo animado del sitio (UC-15, Fase 7b): despachador compartido entre
 * `PublicHomePage` (`modo="sitio"`), el lienzo de Puck (`PuckRoot`,
 * `modo="editor"`) y el panel Fondo (miniaturas y vista previa), de modo que
 * todos se vean igual. Se posiciona `absolute inset-0` detrás del contenido
 * (`z-index: 0`, `pointer-events: none`): el padre debe ser `position:
 * relative` y el contenido real va en un hermano con `z-index` mayor.
 *
 * Normaliza el tipo (`normalizarTipoFondo`: los tipos anteriores de un
 * snapshot ya publicado se muestran como su reemplazo), aplica `opacidad` al
 * contenedor y decide qué hace cada fondo según el modo: la interactividad
 * solo existe en `sitio`, con `configuracion.interactivo !== false`, sin
 * `prefers-reduced-motion` y en un tipo interactivo; con movimiento reducido
 * los canvas dibujan un único fotograma y las animaciones CSS se pausan
 * (regla `.fondo-animado *` de `index.css`). Los colores salen de las
 * variables del tema (`--color-primario/--color-secundario/--color-fondo`).
 */
export function FondoAnimado({ fondo, modo = 'sitio', ambito }: FondoAnimadoProps) {
  const reducido = usePrefiereMovimientoReducido()
  const tipo = normalizarTipoFondo(fondo.tipo)

  if (tipo === 'solido') {
    // El color de fondo ya lo aporta `--color-fondo` sobre el contenedor
    // raíz (ver `temaComoVariablesCss`): no hay nada animado que dibujar.
    return null
  }

  const { configuracion } = fondo
  const velocidad = VELOCIDADES.find((v) => v === configuracion.velocidad) ?? 'media'
  const intensidad = INTENSIDADES.find((i) => i === configuracion.intensidad) ?? 'media'
  const opacidad = configuracion.opacidad ?? 0.5
  const Visual = FONDOS[tipo]

  const props: PropsFondoVisual = {
    velocidad,
    intensidad,
    interactivo:
      modo === 'sitio' &&
      configuracion.interactivo !== false &&
      !reducido &&
      entradaCatalogo(tipo).interactivo,
    estatico: modo === 'miniatura' || reducido,
    maxFps: modo === 'editor' ? 30 : 60,
    ambito: ambito ?? (modo === 'miniatura' ? 'caja' : 'pagina'),
  }

  return (
    <div
      aria-hidden="true"
      data-fondo-tipo={tipo}
      data-fondo-modo={modo}
      style={{ opacity: opacidad }}
      className={cn(
        'fondo-animado pointer-events-none absolute inset-0 z-0 overflow-hidden',
        modo === 'miniatura' && 'fondo-miniatura',
      )}
    >
      <Suspense fallback={null}>
        <Visual {...props} />
      </Suspense>
    </div>
  )
}
