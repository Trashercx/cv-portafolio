import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CargandoPagina } from '@/components/CargandoPagina'
import { useAuthStore } from '@/store/auth-store'
import { useSesionInicial } from './useSesionInicial'

type RequireAuthProps = {
  children: ReactNode
}

/**
 * Gatea el árbol `/admin/*`. Si el store tiene sesión, renderiza. Si no
 * (típicamente tras recargar la página, porque el store vive en memoria),
 * consulta `GET /auth/sesion` (`useSesionInicial`, octava ronda, UC-01):
 * mientras carga muestra `CargandoPagina`; si responde 200 el hook ya volcó
 * el admin al store y se renderiza la ruta; si responde 401 o falla, redirige
 * a /admin/login como antes.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const sesion = useSesionInicial()
  const location = useLocation()

  if (isAuthenticated) return children

  if (sesion.isPending && sesion.fetchStatus !== 'idle') {
    return <CargandoPagina />
  }

  return <Navigate to="/admin/login" replace state={{ from: location }} />
}
