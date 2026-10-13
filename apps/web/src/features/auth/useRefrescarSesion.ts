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
 *
 * `meta.mensajeError` (no un `onError` local): el `mutationCache` global de
 * `query-client.ts` ya muestra un toast por cada error de mutación —
 * agregar un `onError` acá duplicaría el aviso (el genérico del cache más
 * el propio), ambos se ejecutan siempre, TanStack Query no hace que uno
 * suprima al otro. Mismo patrón que el resto de las mutaciones del
 * proyecto (`useTemas`, `useUpsertPerfil`, etc.), ninguna define `onError`
 * propio.
 */
export function useRefrescarSesion() {
  return useMutation({
    mutationFn: () =>
      apiFetch<AdminSession>('/auth/refresh', {
        method: 'POST',
      }),
    onSuccess: (admin) => {
      // Séptima ronda: si el cierre automático de `AvisoSesionExpirando` ya
      // limpió el store mientras este refresh estaba en vuelo, se ignora la
      // respuesta — si no, el store quedaría "autenticado" estando ya en
      // `/admin/login`.
      if (useAuthStore.getState().admin === null) return
      useAuthStore.getState().setAdmin(admin)
    },
    meta: {
      mensajeError: 'No se pudo renovar la sesión. Cerrá sesión y volvé a ingresar.',
    },
  })
}
