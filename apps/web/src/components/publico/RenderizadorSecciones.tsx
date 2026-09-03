import type {
  ColumnasConfiguracion,
  HeroConfiguracion,
  Seccion,
} from '@/features/secciones/types'
import type { SnapshotSitio } from '@/features/publico/types'
import { EnvoltorioSeccion } from './EnvoltorioSeccion'
import { BloqueColumnas, BloqueHero } from './bloques'
import { DespachoBloqueSeccion } from './bloques/DespachoBloqueSeccion'

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
 */
export function RenderizadorSecciones({
  snapshot,
  soloVisibles = true,
}: RenderizadorSeccionesProps) {
  const secciones = [...snapshot.secciones].sort((a, b) => a.orden - b.orden)

  return (
    <div className="grid gap-0">
      {secciones.map((seccion) => {
        if (soloVisibles && !seccion.visible) return null

        return (
          <EnvoltorioSeccion
            key={seccion.id}
            id={seccion.id}
            visible={seccion.visible}
          >
            <BloqueSeccion
              seccion={seccion}
              snapshot={snapshot}
              soloVisibles={soloVisibles}
            />
          </EnvoltorioSeccion>
        )
      })}
    </div>
  )
}

function BloqueSeccion({
  seccion,
  snapshot,
  soloVisibles,
}: {
  seccion: Seccion
  snapshot: SnapshotSitio
  soloVisibles: boolean
}) {
  switch (seccion.tipo_seccion) {
    case 'hero':
      return (
        <BloqueHero
          config={seccion.configuracion as HeroConfiguracion}
          perfil={snapshot.perfil}
        />
      )
    case 'columnas':
      return (
        <BloqueColumnas
          config={seccion.configuracion as ColumnasConfiguracion}
          datos={snapshot}
          soloVisibles={soloVisibles}
        />
      )
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
