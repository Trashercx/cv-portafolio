import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './api-client'
import { useAuthStore } from '@/store/auth-store'

/**
 * Manejador global de sesión expirada: cualquier query/mutation contra una
 * ruta `/admin/*` que responda 401 (cookie httpOnly vencida o ausente)
 * limpia el auth store y fuerza una recarga completa a `/admin/login` con
 * un mensaje.
 *
 * Se excluye explícitamente `/auth/login`: un 401 ahí es "credenciales
 * inválidas o cuenta bloqueada" (UC-01), no una sesión expirada, y la propia
 * pantalla de login ya lo muestra vía `login.error`.
 */
function manejarSesionExpirada(error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 401 &&
    !error.path.startsWith('/auth/')
  ) {
    useAuthStore.getState().clearAdmin()

    if (!window.location.pathname.startsWith('/admin/login')) {
      window.location.assign('/admin/login?sesion=expirada')
    }
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({ onError: manejarSesionExpirada }),
  mutationCache: new MutationCache({ onError: manejarSesionExpirada }),
})
