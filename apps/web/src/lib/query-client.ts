import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from './api-client'
import { useAuthStore } from '@/store/auth-store'

/**
 * Meta opcional de cada `useMutation` (tipado globalmente vía module
 * augmentation de TanStack Query v5, ver la declaración `Register` más
 * abajo). Centraliza el feedback de éxito/error como toasts en el
 * `MutationCache` en vez de repetir `<p role="status">`/`<p role="alert">`
 * en cada pantalla.
 */
declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      mensajeExito?: string
      mensajeError?: string
    }
  }
}

/**
 * Manejador global de sesión expirada: cualquier query/mutation contra una
 * ruta `/admin/*` que responda 401 (cookie httpOnly vencida o ausente)
 * limpia el auth store y fuerza una recarga completa a `/admin/login` con
 * un mensaje.
 *
 * Se excluye explícitamente `/auth/login`: un 401 ahí es "credenciales
 * inválidas o cuenta bloqueada" (UC-01), no una sesión expirada, y la propia
 * pantalla de login ya lo muestra vía `login.error`.
 *
 * Devuelve `true` si actuó (detectó sesión expirada y va a redirigir) para
 * que el `onError` del `MutationCache` pueda evitar mostrar un toast
 * fantasma justo antes de que la redirección de página completa ocurra.
 */
function manejarSesionExpirada(error: unknown): boolean {
  if (
    error instanceof ApiError &&
    error.status === 401 &&
    !error.path.startsWith('/auth/')
  ) {
    useAuthStore.getState().clearAdmin()

    if (!window.location.pathname.startsWith('/admin/login')) {
      window.location.assign('/admin/login?sesion=expirada')
    }
    return true
  }

  return false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({ onError: manejarSesionExpirada }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const actuo = manejarSesionExpirada(error)
      if (actuo) return

      const mensaje =
        error instanceof ApiError
          ? error.message
          : (mutation.meta?.mensajeError ??
            'Ocurrió un error inesperado. Intenta de nuevo.')
      toast.error(mensaje)
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta?.mensajeExito) {
        toast.success(mutation.meta.mensajeExito)
      }
    },
  }),
})
