import type {
  AnchoContenidoBloque,
  BloqueConfiguracionBase,
  ColumnasConfiguracion,
  HeroConfiguracion,
  NavegacionConfiguracion,
  Seccion,
  TipoSeccion,
} from '@/features/secciones/types'
import type { SnapshotSitio } from '@/features/publico/types'
import { ALINEACION_TEXTO_CLASE } from '@/lib/escalas-bloque'
import { anclaSeccion, generarEnlacesNavegacion } from '@/lib/navegacion'
import { EnvoltorioSeccion } from './EnvoltorioSeccion'
import { ProveedorMotion } from './ProveedorMotion'
import { BloqueColumnas, BloqueHero, BloqueNavegacion } from './bloques'
import { DespachoBloqueSeccion } from './bloques/DespachoBloqueSeccion'

/**
 * Fallback de `ancho_contenido` por tipo cuando la `Seccion` no lo tiene en
 * su `configuracion` (guardada antes de la Fase 3.4) — el default genérico
 * de `EnvoltorioSeccion` (`'normal'`, `max-w-5xl`) no coincide con lo que
 * cada uno de estos tipos ya tenía hardcodeado antes de esta fase (`hero`/
 * `columnas` no tenían ningún `max-w`; `sobre-mi`/`logros`/`contacto` eran
 * más angostos que `max-w-5xl`). Sin este mapa, publicar esta fase cambiaría
 * el ancho de esos 5 tipos en cualquier sitio ya existente. Mismo mapa que
 * usa `puck-config.tsx` en cada `render`, para que el lienzo y el sitio
 * publicado no diverjan; los tipos que no aparecen acá (`proyectos`,
 * `certificaciones`, `skills`) ya eran `max-w-5xl`, así que usan el default
 * genérico de `EnvoltorioSeccion` sin necesitar una entrada propia.
 */
const ANCHO_CONTENIDO_POR_DEFECTO_POR_TIPO: Partial<
  Record<TipoSeccion, AnchoContenidoBloque>
> = {
  hero: 'completo',
  columnas: 'completo',
  'sobre-mi': 'estrecho',
  logros: 'estrecho',
  contacto: 'estrecho',
}

type RenderizadorSeccionesProps = {
  snapshot: SnapshotSitio
  /**
   * `true` (por defecto) en el sitio público (UC-12): oculta por completo
   * las secciones con `visible=false`. `false` en la vista previa del panel
   * (UC-10): el admin también necesita ver qué secciones NO se publicarían,
   * así que se muestran atenuadas en vez de ocultarse — mismo criterio ya
   * documentado en `VersionesSitioService.armarSnapshot`.
   */
  soloVisibles?: boolean
}

/**
 * Pinta las `secciones` de un `SnapshotSitio` según su `tipo_seccion`, en su
 * `orden`. Despachador delgado: cada bloque real vive en `bloques/` (Fase
 * 3.1) — este componente solo decide qué bloque usar y lo envuelve en
 * `EnvoltorioSeccion`. Compartido entre la vista previa del panel (UC-10,
 * `PanelVersiones`, incrustado en `EditorSeccionesPage` desde Sprint 7) y la
 * home pública (UC-12, `PublicHomePage`) para no duplicar cómo se
 * interpreta cada bloque. El lienzo del editor de Puck (`puck-config.tsx`,
 * `PuckRoot`) NO pasa por este componente: usa los mismos bloques de
 * `bloques/` directamente, porque ahí cada sección se lee del `content` en
 * edición de Puck, no de un `SnapshotSitio` ya armado.
 *
 * Fase 7 (7.3, UC-12): monta el `ProveedorMotion`, genera los enlaces de la
 * navegación desde las propias secciones del snapshot y calcula el ancla de
 * la sección siguiente (destino del indicador de scroll del hero). El bloque
 * `navegacion` no pasa por `EnvoltorioSeccion` (su `fixed` no tolera un
 * ancestro animado).
 */
export function RenderizadorSecciones({
  snapshot,
  soloVisibles = true,
}: RenderizadorSeccionesProps) {
  const secciones = [...snapshot.secciones].sort((a, b) => a.orden - b.orden)
  const pintadas = secciones.filter((seccion) => !soloVisibles || seccion.visible)
  const enlaces = generarEnlacesNavegacion(secciones, soloVisibles)

  return (
    <ProveedorMotion>
      <div className="grid gap-0">
        {pintadas.map((seccion, indice) => {
          if (seccion.tipo_seccion === 'navegacion') {
            return (
              <BloqueNavegacion
                key={seccion.id}
                config={seccion.configuracion as NavegacionConfiguracion}
                enlaces={enlaces}
                perfil={snapshot.perfil}
                enFlujo={!soloVisibles}
                atenuado={!seccion.visible}
              />
            )
          }

          // Los campos de `BloqueConfiguracionBase` que le tocan a
          // `EnvoltorioSeccion` (Fase 3.4; animación y separador, Fase 7) —
          // compartidos por todos los tipos, así que se leen con este cast
          // acotado en vez de un `switch` por tipo.
          const {
            espaciado_vertical,
            ancho_contenido,
            fondo_bloque,
            separador_inferior,
            animacion_entrada,
            separador_forma,
          } = seccion.configuracion as BloqueConfiguracionBase

          const anchoContenidoEfectivo =
            ancho_contenido ?? ANCHO_CONTENIDO_POR_DEFECTO_POR_TIPO[seccion.tipo_seccion]

          const siguiente = pintadas
            .slice(indice + 1)
            .find((otra) => otra.tipo_seccion !== 'navegacion')

          return (
            <EnvoltorioSeccion
              key={seccion.id}
              id={seccion.id}
              visible={seccion.visible}
              espaciado_vertical={espaciado_vertical}
              ancho_contenido={anchoContenidoEfectivo}
              fondo_bloque={fondo_bloque}
              separador_inferior={separador_inferior}
              animacion_entrada={animacion_entrada}
              separador_forma={separador_forma}
            >
              <BloqueSeccion
                seccion={seccion}
                snapshot={snapshot}
                soloVisibles={soloVisibles}
                hrefSiguiente={siguiente ? `#${anclaSeccion(siguiente.id)}` : undefined}
              />
            </EnvoltorioSeccion>
          )
        })}
      </div>
    </ProveedorMotion>
  )
}

function BloqueSeccion({
  seccion,
  snapshot,
  soloVisibles,
  hrefSiguiente,
}: {
  seccion: Seccion
  snapshot: SnapshotSitio
  soloVisibles: boolean
  hrefSiguiente?: string
}) {
  switch (seccion.tipo_seccion) {
    case 'hero': {
      const config = seccion.configuracion as HeroConfiguracion
      return (
        <BloqueHero
          config={config}
          perfil={snapshot.perfil}
          alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'centro']}
          redesSociales={snapshot.redes_sociales}
          hrefSiguiente={hrefSiguiente}
        />
      )
    }
    case 'columnas':
      return (
        <BloqueColumnas
          config={seccion.configuracion as ColumnasConfiguracion}
          datos={snapshot}
          soloVisibles={soloVisibles}
        />
      )
    case 'navegacion':
      // Se resuelve arriba, en el `map` (sin `EnvoltorioSeccion`).
      return null
    default:
      return (
        <DespachoBloqueSeccion
          tipo_seccion={seccion.tipo_seccion}
          titulo_visible={seccion.titulo_visible}
          configuracion={seccion.configuracion}
          datos={snapshot}
        />
      )
  }
}
