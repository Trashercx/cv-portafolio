import { useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useAuthStore, type AdminSession } from '@/store/auth-store'

/**
 * Fase 7j (UC-01): sesión deslizante. Mientras el administrador use el panel
 * (teclado, puntero, rueda o toques, también dentro del lienzo de Puck, que
 * es un iframe), el token se renueva solo con `POST /auth/refresh` antes de
 * vencer. Si deja la pestaña quieta, no se renueva y vale el aviso de
 * siempre (`AvisoSesionExpirando`: cuenta regresiva y cierre).
 *
 * No cambia el API ni la vida del token (`JWT_EXPIRES_IN`): solo decide
 * CUÁNDO pedir uno nuevo. Un refresh fallido es silencioso (si el token ya
 * no sirve, el siguiente 401 lleva al login como hasta ahora).
 */

/** Se renueva cuando quedan estos milisegundos o menos. */
export const MARGEN_RENOVACION_MS = 5 * 60 * 1000
/** Solo cuenta la actividad de los últimos minutos. */
export const VENTANA_ACTIVIDAD_MS = 5 * 60 * 1000
/** Cada cuánto se evalúa (y se enganchan iframes nuevos). */
export const INTERVALO_REVISION_MS = 15 * 1000
/** Entre dos renovaciones pasa al menos esto (tokens muy cortos). */
export const SEPARACION_MINIMA_MS = 60 * 1000

const EVENTOS_ACTIVIDAD = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'input'] as const

export function useSesionDeslizante() {
  const expiresAt = useAuthStore((state) => state.admin?.expiresAt ?? null)
  // Se inicializa en el efecto (no `Date.now()` en el render: debe ser puro).
  const ultimaActividad = useRef(0)
  const ultimaRenovacion = useRef(0)
  const enVuelo = useRef(false)

  useEffect(() => {
    if (!expiresAt) return

    const registrar = () => {
      ultimaActividad.current = Date.now()
    }
    // Montar el panel (login o recarga) cuenta como actividad.
    if (ultimaActividad.current === 0) registrar()
    const opciones: AddEventListenerOptions = { passive: true, capture: true }
    const documentos = new Set<Document>()
    const enganchar = (doc: Document) => {
      if (documentos.has(doc)) return
      documentos.add(doc)
      for (const evento of EVENTOS_ACTIVIDAD) doc.addEventListener(evento, registrar, opciones)
    }
    // El lienzo de Puck es un iframe del mismo origen: sus eventos no suben a
    // la ventana principal, así que se escucha también su documento.
    const engancharIframes = () => {
      for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
        try {
          if (iframe.contentDocument) enganchar(iframe.contentDocument)
        } catch {
          // Iframe de otro origen: se ignora.
        }
      }
    }

    const revisar = () => {
      engancharIframes()
      const admin = useAuthStore.getState().admin
      if (!admin || enVuelo.current) return
      const ahora = Date.now()
      const restante = new Date(admin.expiresAt).getTime() - ahora
      const activo =
        ultimaActividad.current > ultimaRenovacion.current &&
        ahora - ultimaActividad.current <= VENTANA_ACTIVIDAD_MS
      if (restante <= 0 || restante > MARGEN_RENOVACION_MS || !activo) return
      if (ahora - ultimaRenovacion.current < SEPARACION_MINIMA_MS) return

      enVuelo.current = true
      ultimaRenovacion.current = ahora
      apiFetch<AdminSession>('/auth/refresh', { method: 'POST' })
        .then((nueva) => {
          // Si mientras tanto se cerró la sesión, no se revive.
          if (useAuthStore.getState().admin !== null) useAuthStore.getState().setAdmin(nueva)
        })
        .catch(() => undefined)
        .finally(() => {
          enVuelo.current = false
        })
    }

    enganchar(document)
    revisar()
    const intervalo = window.setInterval(revisar, INTERVALO_REVISION_MS)
    return () => {
      window.clearInterval(intervalo)
      for (const doc of documentos) {
        for (const evento of EVENTOS_ACTIVIDAD) doc.removeEventListener(evento, registrar, opciones)
      }
    }
  }, [expiresAt])
}

/** Canal entre pestañas del panel (mismo origen). */
export const CANAL_SESION = 'cv-portafolio-sesion'

type MensajeSesion = { tipo: 'renovada'; expiresAt: string }

/**
 * Fase 7j (UC-01): el store de sesión vive en memoria por pestaña, pero la
 * cookie es compartida. Si una pestaña renueva el token y otra (quieta)
 * conserva el `expiresAt` viejo, esa otra llegaría a "sesión expirada" y su
 * `POST /auth/logout` borraría la cookie de las dos. Cada renovación se
 * anuncia por `BroadcastChannel` y las demás pestañas adoptan el
 * vencimiento nuevo (solo si es posterior y siguen con sesión). Sin
 * `BroadcastChannel` no hace nada.
 */
export function useSincronizarSesionEntrePestanas() {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const canal = new BroadcastChannel(CANAL_SESION)
    let ultimoRecibido: string | null = null

    canal.onmessage = (evento: MessageEvent<MensajeSesion>) => {
      const mensaje = evento.data
      if (mensaje?.tipo !== 'renovada' || typeof mensaje.expiresAt !== 'string') return
      const admin = useAuthStore.getState().admin
      if (!admin) return
      const nuevo = new Date(mensaje.expiresAt).getTime()
      if (!Number.isFinite(nuevo) || nuevo <= new Date(admin.expiresAt).getTime()) return
      ultimoRecibido = mensaje.expiresAt
      useAuthStore.getState().setAdmin({ ...admin, expiresAt: mensaje.expiresAt })
    }

    const desuscribir = useAuthStore.subscribe((estado, anterior) => {
      const expiresAt = estado.admin?.expiresAt
      if (!expiresAt || !anterior.admin || expiresAt === anterior.admin.expiresAt) return
      // Lo que llegó de otra pestaña no se reenvía (evita ecos).
      if (expiresAt === ultimoRecibido) return
      canal.postMessage({ tipo: 'renovada', expiresAt } satisfies MensajeSesion)
    })

    return () => {
      desuscribir()
      canal.close()
    }
  }, [])
}
