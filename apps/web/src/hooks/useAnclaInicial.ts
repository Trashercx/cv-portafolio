import { useEffect } from 'react'
import type { Seccion } from '@/features/secciones/types'
import { generarAnclasSecciones, resolverAnclaHeredada } from '@/lib/navegacion'

type SeccionParaAncla = Pick<Seccion, 'id' | 'tipo_seccion' | 'titulo_visible' | 'visible' | 'orden'>

/**
 * Fase 7n (#73, UC-12): lleva al visitante a la sección que pide el `hash`
 * de la URL cuando el sitio termina de cargar. Hace falta porque el snapshot
 * llega por `fetch` después del `load`: el navegador ya intentó saltar al
 * fragmento cuando la sección aún no existía. Además traduce los enlaces
 * antiguos `#seccion-{uuid}` (compartidos antes de esta fase) al slug nuevo y
 * corrige la URL con `replaceState` para que al copiarla salga legible.
 * Corre una vez por snapshot; los clics posteriores en el menú los resuelve
 * el navegador solo. Si más tarde un enlace interno antiguo (un botón del
 * hero guardado con `#seccion-{uuid}`) cambia el hash, el navegador ya
 * aterriza por el alias que pinta `EnvoltorioSeccion` y aquí solo se corrige
 * la URL al slug.
 */
export function useAnclaInicial(secciones: SeccionParaAncla[] | undefined) {
  // Clave estable: cambia solo si cambia algo que altere las anclas (id,
  // orden, visibilidad o título de alguna sección).
  const clave = secciones
    ? secciones
        .map((seccion) => `${seccion.id}:${seccion.orden}:${seccion.visible}:${seccion.titulo_visible}`)
        .join('|')
    : ''

  useEffect(() => {
    if (!secciones || secciones.length === 0 || typeof window === 'undefined') return
    const ordenadas = [...secciones].sort((a, b) => a.orden - b.orden)
    const destino = resolverAnclaHeredada(window.location.hash, generarAnclasSecciones(ordenadas, true))
    if (!destino) return
    if (destino.heredada) {
      window.history.replaceState(window.history.state, '', `#${destino.ancla}`)
    }
    // `scrollIntoView` respeta `scroll-margin-top` (scroll-mt-24 de la sección)
    // y `scroll-behavior` del documento (suave si la navegación lo activó).
    document.getElementById(destino.ancla)?.scrollIntoView()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume `secciones`.
  }, [clave])

  useEffect(() => {
    if (!secciones || secciones.length === 0 || typeof window === 'undefined') return
    const ordenadas = [...secciones].sort((a, b) => a.orden - b.orden)
    const anclas = generarAnclasSecciones(ordenadas, true)
    const alCambiarHash = () => {
      const destino = resolverAnclaHeredada(window.location.hash, anclas)
      if (destino?.heredada) {
        window.history.replaceState(window.history.state, '', `#${destino.ancla}`)
      }
    }
    window.addEventListener('hashchange', alCambiarHash)
    return () => window.removeEventListener('hashchange', alCambiarHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume `secciones`.
  }, [clave])
}
