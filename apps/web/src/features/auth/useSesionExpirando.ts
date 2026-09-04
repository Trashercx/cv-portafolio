import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'

/**
 * A cuántos segundos o menos de `admin.expiresAt` se muestra el aviso de
 * expiración de sesión (Fase 4.4).
 */
const UMBRAL_AVISO_SEGUNDOS = 30

/**
 * Cada cuánto se recalcula el tiempo restante mientras hay una sesión
 * activa. 1s es preciso de sobra para un umbral de 30s sin recalcular en
 * cada render.
 */
const INTERVALO_CHEQUEO_MS = 1000

/**
 * Throttle mínimo entre registros de "última actividad": no necesitamos la
 * marca al milisegundo, solo saber que el usuario sigue ahí. Evita escribir
 * la ref en cada `mousemove`.
 */
const THROTTLE_ACTIVIDAD_MS = 1000

const EVENTOS_ACTIVIDAD = ['mousemove', 'keydown', 'click'] as const

function segundosRestantesHasta(expiresAt: string): number {
  const restanteMs = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(restanteMs / 1000))
}

/**
 * Calcula cuándo mostrar el aviso de expiración de sesión del panel
 * (Fase 4.4): cuando quedan `UMBRAL_AVISO_SEGUNDOS` segundos o menos hasta
 * `admin.expiresAt` (del auth store), expone `mostrarAviso: true`.
 *
 * También escucha actividad del usuario (`mousemove`/`keydown`/`click`)
 * para llevar la marca de tiempo de la última interacción — por ahora es
 * solo la marca (`ultimaActividadRef`), sin efecto sobre `mostrarAviso`: el
 * aviso de esta fase es puramente por tiempo hasta `expiresAt`, no por
 * inactividad. Queda disponible para una futura extensión (p. ej. no
 * molestar con el aviso si el usuario está inactivo) sin tener que
 * reestructurar el hook.
 *
 * Si no hay sesión (`admin` es `null`), no hace nada y no monta timers.
 */
export function useSesionExpirando() {
  const admin = useAuthStore((state) => state.admin)
  const expiresAt = admin?.expiresAt ?? null

  const [mostrarAviso, setMostrarAviso] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(0)
  const ultimaActividadRef = useRef(Date.now())

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

  useEffect(() => {
    if (!expiresAt) {
      return
    }

    const registrarActividad = () => {
      const ahora = Date.now()
      if (ahora - ultimaActividadRef.current >= THROTTLE_ACTIVIDAD_MS) {
        ultimaActividadRef.current = ahora
      }
    }

    for (const evento of EVENTOS_ACTIVIDAD) {
      document.addEventListener(evento, registrarActividad)
    }
    return () => {
      for (const evento of EVENTOS_ACTIVIDAD) {
        document.removeEventListener(evento, registrarActividad)
      }
    }
  }, [expiresAt])

  return { mostrarAviso, segundosRestantes }
}
