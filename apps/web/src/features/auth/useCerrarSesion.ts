import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'

/**
 * Cierre de sesión real (Fase 6, UC-01): `POST /auth/logout` (204) hace que
 * el API borre la cookie httpOnly `access_token`, que el frontend nunca puede
 * tocar por sí mismo.
 *
 * `onSettled` (éxito o error, p. ej. sin red o con la cookie ya vencida)
 * siempre limpia el auth store, vacía la caché de TanStack Query (para que no
 * queden datos del admin en memoria) y navega al login: el usuario quiere
 * salir pase lo que pase con el servidor. `/auth/logout` cae bajo `/auth/*`,
 * que el manejo global de 401 de `query-client.ts` ignora, así que no dispara
 * la recarga a `?sesion=expirada`.
 *
 * `destino` permite al auto-logout por expiración llevar al login con el
 * motivo (`/admin/login?sesion=expirada`).
 */
export function useCerrarSesion(destino = '/admin/login') {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearAdmin = useAuthStore((state) => state.clearAdmin)

  return useMutation({
    // Mejor esfuerzo: un fallo (sin red, 401 por cookie ya vencida) se
    // descarta para que el `MutationCache` global no muestre un toast de
    // error justo al salir; `onSettled` cierra la sesión local igual.
    mutationFn: () =>
      apiFetch<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
    onSettled: () => {
      clearAdmin()
      queryClient.clear()
      navigate(destino, { replace: true })
    },
  })
}
