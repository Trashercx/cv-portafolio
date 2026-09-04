import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useAuthStore, type AdminSession } from '@/store/auth-store'

/**
 * POST /auth/refresh (Fase 4.4). Requiere la cookie httpOnly `access_token`
 * todavía vigente — si ya expiró, el backend responde 401 y no hay forma de
 * refrescar (intencional, ver contrato). Sin body de request.
 *
 * En éxito, actualiza el auth store con el nuevo `expiresAt` (mismo shape
 * que `POST /auth/login`): eso es lo que hace que `useSesionExpirando`
 * recalcule y el aviso desaparezca solo, sin que este hook necesite saber
 * nada de la UI que lo dispara.
 */
export function useRefrescarSesion() {
  return useMutation({
    mutationFn: () =>
      apiFetch<AdminSession>('/auth/refresh', {
        method: 'POST',
      }),
    onSuccess: (admin) => {
      useAuthStore.getState().setAdmin(admin)
    },
  })
}
