import { useMemo } from 'react'
import { BloqueNavegacion } from '@/components/publico/bloques'
import type { PerfilPublico } from '@/features/publico/types'
import type { NavegacionConfiguracion, TipoSeccion } from '@/features/secciones/types'
import { generarEnlacesNavegacion } from '@/lib/navegacion'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'

type NavegacionEnLienzoProps = {
  config: NavegacionConfiguracion
  visible: boolean
  perfil: PerfilPublico | null
}

/**
 * Navegación dentro del lienzo (Fase 7, 7.3, UC-07): los enlaces se generan
 * con las secciones del `content` ACTUAL de Puck, espejado en
 * `useEditorSeccionesStore` (el lienzo vive en el mismo contexto JS que el
 * panel, `createPortal` dentro del iframe), así que reflejan al instante
 * altas, bajas, reordenamientos y cambios de título/visibilidad antes de
 * guardar. Las secciones guardadas usan su `_seccionId` (la misma ancla que
 * ponen `EnvoltorioSeccion` y el sitio público) y las nuevas el `id` de Puck.
 *
 * Limitación conocida (Fase 7, UC-12): Puck envuelve cada componente en un
 * `div` del mismo alto que su contenido, y `position: sticky` solo se mueve
 * dentro de su contenedor, así que en el lienzo la barra es una muestra EN
 * FLUJO (conserva la clase `sticky` por coherencia con la vista previa, pero
 * no se pega al hacer scroll). El comportamiento fijo real solo se aprecia en
 * la vista previa y en el sitio publicado. La atenuación de una sección oculta
 * se aplica sobre el propio `nav` (prop `atenuado`), sin `div` envolvente.
 */
export function NavegacionEnLienzo({ config, visible, perfil }: NavegacionEnLienzoProps) {
  const content = useEditorSeccionesStore((state) => state.content)
  const enlaces = useMemo(
    () =>
      generarEnlacesNavegacion(
        content.map((item) => {
          const props = item.props as {
            id: string
            _seccionId?: string
            _visible?: boolean
            _tituloVisible?: string
          }
          return {
            id: props._seccionId ?? props.id,
            tipo_seccion: item.type as TipoSeccion,
            titulo_visible: props._tituloVisible ?? '',
            visible: props._visible !== false,
          }
        }),
      ),
    [content],
  )

  return (
    <BloqueNavegacion config={config} enlaces={enlaces} perfil={perfil} atenuado={!visible} />
  )
}
