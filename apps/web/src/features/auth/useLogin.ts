import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { AdminSession } from '@/store/auth-store'

export type LoginPayload = {
  email: string
  password: string
}

/**
 * POST /auth/login. El backend setea la cookie httpOnly `access_token` en
 * la respuesta; este hook no la lee ni la guarda, solo devuelve los datos
 * del admin del body de éxito para que la pantalla los pase al auth store.
 */
export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      apiFetch<AdminSession>('/auth/login', {
        method: 'POST',
        body: payload,
      }),
  })
}
