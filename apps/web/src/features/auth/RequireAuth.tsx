import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

type RequireAuthProps = {
  children: ReactNode
}

/**
 * Redirige a /admin/login si no hay sesión en el auth store (chequeo en
 * memoria, Sprint 0).
 *
 * Pendiente (fuera de alcance): esto NO valida la cookie httpOnly contra
 * el backend. Si el admin refresca la página completa, el store se
 * reinicia y se lo manda a /admin/login aunque la cookie siga siendo
 * válida en el servidor. La validación real ("whoami" al montar la app)
 * queda como tarea futura.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return children
}
