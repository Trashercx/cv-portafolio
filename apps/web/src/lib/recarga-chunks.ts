/**
 * Recarga única ante fallos de carga de chunks diferidos (post-Fase 6, UC-07).
 *
 * Cuando un despliegue reemplaza los assets con pestañas abiertas (o hay un
 * fallo de red puntual), Vite dispara `vite:preloadError` en `window`. Se
 * recarga la página UNA sola vez por URL dentro de la ventana: si el fallo es
 * determinista (p. ej. CSS bloqueado por la CSP) un segundo intento no
 * recarga y el error llega al `ErrorBoundary`, evitando bucles.
 */

export const PREFIJO_CLAVE_RECARGA = 'recarga-chunk:'
export const VENTANA_RECARGA_MS = 60_000

/** Devuelve true si recargó; false si ya se había recargado hace menos de 60 s. */
export function recargarUnaVezPorUrl(): boolean {
  const clave = `${PREFIJO_CLAVE_RECARGA}${window.location.pathname}`
  try {
    const previo = window.sessionStorage.getItem(clave)
    if (previo !== null) {
      const hace = Date.now() - Number(previo)
      if (Number.isFinite(hace) && hace < VENTANA_RECARGA_MS) return false
    }
    window.sessionStorage.setItem(clave, String(Date.now()))
  } catch {
    // sessionStorage no disponible: sin forma de evitar el bucle, no recargar.
    return false
  }
  window.location.reload()
  return true
}

/** Registra el listener de `vite:preloadError`; devuelve la función de baja. */
export function registrarRecargaChunks(): () => void {
  const manejar = (event: Event) => {
    if (recargarUnaVezPorUrl()) event.preventDefault()
  }
  window.addEventListener('vite:preloadError', manejar)
  return () => window.removeEventListener('vite:preloadError', manejar)
}
