import { useEffect, useState } from 'react'
import type { ModoTema } from '@/lib/tema-oscuro'

const STORAGE_KEY = 'sitio-publico-modo-tema'
const MEDIA_QUERY = '(prefers-color-scheme: dark)'
// `PublicHomePage` (para las variables CSS) y `ToggleModoTema` (para el
// botón) montan cada uno su propia instancia de este hook — sin este evento
// interno, `setModo` de una instancia no movería el `useState` de la otra
// dentro de la misma pestaña (a diferencia del evento nativo `storage`, que
// el navegador NO dispara en la pestaña que originó el cambio). `detail`
// lleva el override crudo (`ModoTema | null`), igual que el argumento de
// `setModo`.
const EVENTO_CAMBIO_LOCAL = 'sitio-publico-modo-tema:cambio'

/**
 * Sistema de modo oscuro del SITIO PÚBLICO (Fase 4.6, UC-12), independiente
 * del toggle de chrome del panel admin (`components/theme/ThemeProvider.tsx`,
 * key `'panel-admin-theme'`) — de ahí la key de `localStorage` distinta.
 */
function leerOverrideGuardado(): ModoTema | null {
  try {
    if (typeof window === 'undefined') return null
    const guardado = window.localStorage.getItem(STORAGE_KEY)
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : null
  } catch {
    // `localStorage` puede fallar (modo privado estricto, contextos de
    // testing sin storage real, etc.): se degrada a "sin override".
    return null
  }
}

function leerPreferenciaSistema(): ModoTema {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return 'claro'
    return window.matchMedia(MEDIA_QUERY).matches ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

/**
 * Modo de tema del sitio público: sigue `prefers-color-scheme` del sistema
 * operativo por defecto (reactivo a cambios en vivo), salvo que el visitante
 * haya elegido un override manual (persistido en `localStorage`), que
 * siempre gana sobre la preferencia del sistema. `setModo(null)` borra el
 * override y vuelve a seguir el sistema.
 */
export function useModoTema(): {
  modo: ModoTema
  setModo: (modo: ModoTema | null) => void
} {
  const [override, setOverride] = useState<ModoTema | null>(() =>
    leerOverrideGuardado(),
  )
  const [preferenciaSistema, setPreferenciaSistema] = useState<ModoTema>(() =>
    leerPreferenciaSistema(),
  )

  useEffect(() => {
    let consulta: MediaQueryList | null = null
    try {
      if (typeof window === 'undefined' || !window.matchMedia) return
      consulta = window.matchMedia(MEDIA_QUERY)
    } catch {
      return
    }

    const actualizar = () => {
      setPreferenciaSistema(consulta?.matches ? 'oscuro' : 'claro')
    }
    consulta.addEventListener('change', actualizar)
    return () => consulta?.removeEventListener('change', actualizar)
  }, [])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const handleCambioLocal = (event: Event) => {
        setOverride((event as CustomEvent<ModoTema | null>).detail ?? null)
      }
      window.addEventListener(EVENTO_CAMBIO_LOCAL, handleCambioLocal)
      return () =>
        window.removeEventListener(EVENTO_CAMBIO_LOCAL, handleCambioLocal)
    } catch {
      return
    }
  }, [])

  const setModo = (siguiente: ModoTema | null) => {
    setOverride(siguiente)
    try {
      if (typeof window === 'undefined') return
      if (siguiente === null) {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        window.localStorage.setItem(STORAGE_KEY, siguiente)
      }
      window.dispatchEvent(
        new CustomEvent(EVENTO_CAMBIO_LOCAL, { detail: siguiente }),
      )
    } catch {
      // Sin persistencia/eventos disponibles: el override sigue vivo en
      // memoria para esta instancia (estado de React ya actualizado arriba).
    }
  }

  return { modo: override ?? preferenciaSistema, setModo }
}
