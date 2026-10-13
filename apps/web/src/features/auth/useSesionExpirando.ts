import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'

/**
 * A cuántos segundos o menos de `admin.expiresAt` se muestra el aviso de
 * expiración de sesión (Fase 4.4). Séptima ronda: sube de 30s a 60s para que
 * el aviso incluya una cuenta regresiva de 1 minuto antes del cierre
 * automático de la sesión.
 */
const UMBRAL_AVISO_SEGUNDOS = 60

/**
 * Cada cuánto se recalcula el tiempo restante mientras hay una sesión
 * activa. 1s es preciso de sobra para un umbral de 60s sin recalcular en
 * cada render.
 */
const INTERVALO_CHEQUEO_MS = 1000

function segundosRestantesHasta(expiresAt: string): number {
  const restanteMs = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(restanteMs / 1000))
}

/**
 * Calcula cuándo mostrar el aviso de expiración de sesión del panel
 * (Fase 4.4): cuando quedan `UMBRAL_AVISO_SEGUNDOS` segundos o menos hasta
 * `admin.expiresAt` (del auth store), expone `mostrarAviso: true`. Es
 * puramente por tiempo, no por inactividad — no hay tracking de actividad
 * del usuario en este hook.
 *
 * Séptima ronda: además expone `sesionExpirada` (hay sesión y ya no quedan
 * segundos), que `AvisoSesionExpirando` usa para cerrar la sesión sola sin
 * esperar a que una petición devuelva 401.
 *
 * Si no hay sesión (`admin` es `null`), no hace nada y no monta timers.
 */
export function useSesionExpirando() {
  const admin = useAuthStore((state) => state.admin)
  const expiresAt = admin?.expiresAt ?? null

  const [mostrarAviso, setMostrarAviso] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(0)

  useEffect(() => {
    if (!expiresAt) {
      setMostrarAviso(false)
      setSegundosRestantes(0)
      return
    }

    const recalcular = () => {
      const restantes = segundosRestantesHasta(expiresAt)
      setSegundosRestantes(restantes)
      setMostrarAviso(restantes <= UMBRAL_AVISO_SEGUNDOS)
    }

    recalcular()
    const intervalId = window.setInterval(recalcular, INTERVALO_CHEQUEO_MS)
    return () => window.clearInterval(intervalId)
  }, [expiresAt])

  const sesionExpirada =
    expiresAt !== null && segundosRestantes === 0 && mostrarAviso

  return { mostrarAviso, segundosRestantes, sesionExpirada }
}
