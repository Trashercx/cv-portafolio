import { ApiError } from '@/lib/api-client'

/** Fase 7f, UC-01: causas de fallo del login que la pantalla distingue. */
export type TipoErrorLogin = 'credenciales' | 'bloqueo' | 'limite' | 'red'

export type ErrorLogin = {
  tipo: TipoErrorLogin
  /** Mensaje del API (solo para `bloqueo`, que informa hasta cuándo/por qué). */
  mensajeApi?: string
}

/**
 * Fase 7f, UC-01: clasifica el error de `POST /auth/login`. 401 con "Cuenta
 * bloqueada…" es bloqueo (UC-01, 3 intentos); cualquier otro 401 son
 * credenciales; 429 es el throttle por IP; el resto (5xx, red caída,
 * `TypeError` de `fetch`) cae en `red`.
 */
export function clasificarErrorLogin(error: unknown): ErrorLogin | null {
  if (!error) return null
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return /cuenta bloqueada/i.test(error.message)
        ? { tipo: 'bloqueo', mensajeApi: error.message }
        : { tipo: 'credenciales' }
    }
    if (error.status === 429) return { tipo: 'limite' }
  }
  return { tipo: 'red' }
}

/** Fase 7f, UC-01: iniciales (máx. 2) de un nombre completo. */
export function inicialesDe(nombre: string | undefined | null): string {
  if (!nombre) return ''
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')
}

export const CLAVE_EMAIL_RECORDADO = 'login-email'

/** Fase 7f, UC-01: solo el email, nunca la contraseña; tolera storage no disponible. */
export function leerEmailRecordado(): string {
  try {
    return window.localStorage.getItem(CLAVE_EMAIL_RECORDADO) ?? ''
  } catch {
    return ''
  }
}

export function guardarEmailRecordado(email: string | null): void {
  try {
    if (email) window.localStorage.setItem(CLAVE_EMAIL_RECORDADO, email)
    else window.localStorage.removeItem(CLAVE_EMAIL_RECORDADO)
  } catch {
    // Sin storage: simplemente no se recuerda.
  }
}
