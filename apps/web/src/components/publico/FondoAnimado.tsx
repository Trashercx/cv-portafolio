import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react'
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
   * sí, interactividad no, canvas a 30 fps como máximo. `miniatura` (novena
   * ronda, UC-15): animación CSS siempre activa y canvas a 20 fps como máximo
   * (pausados fuera de pantalla o con la pestaña oculta), con intensidad
   * `sutil` implícita en los canvas y sin puntero ni scroll.
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
  // Fase 7c (UC-15): tsparticles (chunk compartido de las seis) y shaders con ogl (chunk compartido de las cinco).
  constelacion: lazy(() =>
    import('./fondos/tsparticles/Constelacion').then((m) => ({ default: m.Constelacion })),
  ),
  nieve: lazy(() =>
    import('./fondos/tsparticles/Nieve').then((m) => ({ default: m.Nieve })),
  ),
  luciernagas: lazy(() =>
    import('./fondos/tsparticles/Luciernagas').then((m) => ({ default: m.Luciernagas })),
  ),
  burbujas: lazy(() =>
    import('./fondos/tsparticles/Burbujas').then((m) => ({ default: m.Burbujas })),
  ),
  estrellas_fugaces: lazy(() =>
    import('./fondos/tsparticles/EstrellasFugaces').then((m) => ({ default: m.EstrellasFugaces })),
  ),
  confeti_suave: lazy(() =>
    import('./fondos/tsparticles/ConfetiSuave').then((m) => ({ default: m.ConfetiSuave })),
  ),
  aurora_boreal: lazy(() =>
    import('./fondos/ogl/AuroraBoreal').then((m) => ({ default: m.AuroraBoreal })),
  ),
  seda: lazy(() =>
    import('./fondos/ogl/Seda').then((m) => ({ default: m.Seda })),
  ),
  plasma: lazy(() =>
    import('./fondos/ogl/Plasma').then((m) => ({ default: m.Plasma })),
  ),
  liquido: lazy(() =>
    import('./fondos/ogl/Liquido').then((m) => ({ default: m.Liquido })),
  ),
  ondas_dither: lazy(() =>
    import('./fondos/ogl/OndasDither').then((m) => ({ default: m.OndasDither })),
  ),
}

/** Tipos con canvas (los que más cuestan en miniatura). */
const INTENSIDAD_SUTIL_EN_MINIATURA: ReadonlySet<string> = new Set(['particulas_red', 'campo_estrellas'])

const MAX_FPS_POR_MODO: Record<ModoFondo, number> = { sitio: 60, editor: 30, miniatura: 20 }

const VELOCIDADES: readonly VelocidadFondo[] = ['lenta', 'media', 'rapida']
const INTENSIDADES: readonly IntensidadFondo[] = ['sutil', 'media', 'alta']

/**
 * Fase 7b, UC-15: en `modo="sitio"` el fondo se monta solo después de la carga
 * de la página (`load`) y del primer hueco de inactividad. Presupuesto de
 * Lighthouse: el chunk lazy y las capas con blur/conic a pantalla completa no
 * deben competir con el LCP ni el TBT; mientras tanto el `--color-fondo` del
 * contenedor ya da el color base. `editor` y `miniatura` montan de inmediato.
 */
function useFondoListo(diferir: boolean): boolean {
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!diferir) return
    let cancelado = false
    let idleId: number | undefined
    let timerId: ReturnType<typeof setTimeout> | undefined

    const programar = () => {
      if (cancelado) return
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => !cancelado && setListo(true), { timeout: 1500 })
      } else {
        timerId = setTimeout(() => !cancelado && setListo(true), 300)
      }
    }

    if (document.readyState === 'complete') {
      programar()
    } else {
      window.addEventListener('load', programar, { once: true })
    }

    return () => {
      cancelado = true
      window.removeEventListener('load', programar)
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timerId !== undefined) clearTimeout(timerId)
    }
  }, [diferir])

  return !diferir || listo
}

/**
 * Fondo animado del sitio (UC-15, Fases 7b y 7c): despachador compartido entre
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
 * (regla `.fondo-animado *` de `index.css`, también en miniatura). Los colores salen de las
 * variables del tema (`--color-primario/--color-secundario/--color-fondo`).
 */
export function FondoAnimado({ fondo, modo = 'sitio', ambito }: FondoAnimadoProps) {
  const reducido = usePrefiereMovimientoReducido()
  const tipo = normalizarTipoFondo(fondo.tipo)
  const listo = useFondoListo(modo === 'sitio')

  if (tipo === 'solido' || !listo) {
    // El color de fondo ya lo aporta `--color-fondo` sobre el contenedor
    // raíz (ver `temaComoVariablesCss`): no hay nada animado que dibujar.
    return null
  }

  const { configuracion } = fondo
  const velocidad = VELOCIDADES.find((v) => v === configuracion.velocidad) ?? 'media'
  const intensidadConfigurada = INTENSIDADES.find((i) => i === configuracion.intensidad) ?? 'media'
  // Novena ronda (UC-15): nueve miniaturas animando a la vez; los canvas bajan a
  // la intensidad `sutil` (menos partículas/estrellas) para que sigan siendo baratos.
  const intensidad =
    modo === 'miniatura' && INTENSIDAD_SUTIL_EN_MINIATURA.has(tipo) ? 'sutil' : intensidadConfigurada
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
    // Novena ronda (UC-15): la miniatura ya no es estática; solo el movimiento reducido congela.
    estatico: reducido,
    maxFps: MAX_FPS_POR_MODO[modo],
    ambito: ambito ?? (modo === 'miniatura' ? 'caja' : 'pagina'),
    modo,
  }

  return (
    <div
      aria-hidden="true"
      data-fondo-tipo={tipo}
      data-fondo-modo={modo}
      style={{ opacity: opacidad }}
      className={cn(
        'fondo-animado pointer-events-none absolute inset-0 z-0 overflow-hidden',
        // Gancho sin estilos (novena ronda): la pausa CSS ya no existe; lo usan los tests.
        modo === 'miniatura' && 'fondo-miniatura',
      )}
    >
      <Suspense fallback={null}>
        <Visual {...props} />
      </Suspense>
    </div>
  )
}
