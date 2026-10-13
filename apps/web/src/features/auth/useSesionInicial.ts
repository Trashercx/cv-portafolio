import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { useAuthStore, type AdminSession } from '@/store/auth-store'

/**
 * GET /auth/sesion (octava ronda, UC-01): rehidrata la sesión del panel al
 * recargar la página. El store de sesión vive solo en memoria, así que tras
 * un F5 está vacío aunque la cookie httpOnly `access_token` siga vigente; el
 * endpoint (guard JWT) responde 200 con la misma forma que `POST /auth/refresh`
 * (`AdminSession`) o 401 sin cookie válida.
 *
 * Solo se consulta cuando el store todavía no tiene admin (`enabled`), una
 * sola vez (`retry: false`, `staleTime: Infinity`) y sin reintentos. `gcTime: 0`
 * descarta la respuesta al desmontar el árbol admin: tras un cierre de sesión
 * no debe reaparecer una sesión cacheada. El 401 no dispara el cierre global
 * de `lib/query-client.ts` porque la ruta empieza por `/auth/`.
 */
export function useSesionInicial() {
  // Se decide una sola vez al montar: un cierre de sesión posterior (store
  // vacío con el árbol ya montado) no debe disparar una consulta nueva.
  const [debeConsultar] = useState(() => useAuthStore.getState().admin === null)
  return useQuery({
    queryKey: ['auth', 'sesion'],
    queryFn: async () => {
      const admin = await apiFetch<AdminSession>('/auth/sesion')
      // Se vuelca al store dentro del queryFn: así el primer render con datos
      // ya ve `isAuthenticated` y `RequireAuth` no parpadea hacia el login.
      useAuthStore.getState().setAdmin(admin)
      return admin
    },
    enabled: debeConsultar,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  })
}
