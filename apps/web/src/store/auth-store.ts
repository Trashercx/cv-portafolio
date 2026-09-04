import { create } from 'zustand'

export type AdminSession = {
  email: string
  nombre: string
  /**
   * ISO 8601. Momento en que expira la cookie httpOnly `access_token`
   * (devuelto por `POST /auth/login` y `POST /auth/refresh`). Lo usa
   * `useSesionExpirando` para calcular cuándo mostrar el aviso de expiración
   * (Fase 4.4) — nunca se usa para autorizar nada, solo para UX.
   */
  expiresAt: string
}

type AuthState = {
  admin: AdminSession | null
  isAuthenticated: boolean
  setAdmin: (admin: AdminSession) => void
  clearAdmin: () => void
}

/**
 * Estado de sesión del administrador, solo en memoria (no persiste en
 * localStorage/sessionStorage): el token vive exclusivamente en la cookie
 * httpOnly que maneja el backend. Este store únicamente responde "hay una
 * sesión activa en esta pestaña" para gatear rutas y mostrar el nombre.
 *
 * Pendiente (fuera de alcance de Sprint 0): validar la cookie contra el
 * backend ("whoami") al cargar la app, para no perder la sesión al
 * refrescar la página completa.
 */
export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isAuthenticated: false,
  setAdmin: (admin) => set({ admin, isAuthenticated: true }),
  clearAdmin: () => set({ admin: null, isAuthenticated: false }),
}))
