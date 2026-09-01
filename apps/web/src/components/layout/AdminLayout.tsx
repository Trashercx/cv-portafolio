import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

const NAV_ITEMS = [
  { to: '/admin/perfil', label: 'Perfil' },
  { to: '/admin/proyectos', label: 'Proyectos' },
  { to: '/admin/certificaciones', label: 'Certificaciones' },
  { to: '/admin/logros', label: 'Logros' },
  { to: '/admin/redes', label: 'Redes sociales' },
  { to: '/admin/editor', label: 'Editor visual' },
  { to: '/admin/tema', label: 'Tema' },
  { to: '/admin/media', label: 'Biblioteca de medios' },
  { to: '/admin/publicacion', label: 'Publicación' },
]

/**
 * Layout de administración: navegación superior a las 5 secciones de
 * contenido (UC-02 a UC-06), el editor visual/tema/biblioteca (UC-07 a
 * UC-09), publicación (UC-10, UC-11) + botón de cerrar sesión.
 *
 * "Cerrar sesión" en Sprint 2 solo limpia el auth store (en memoria) y
 * redirige a `/admin/login` — no hay endpoint de logout real en el backend
 * todavía (la sesión sigue siendo válida server-side hasta que expire la
 * cookie). Pendiente: agregar `POST /auth/logout` que invalide la cookie
 * del lado del servidor antes de producción.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const admin = useAuthStore((state) => state.admin)
  const clearAdmin = useAuthStore((state) => state.clearAdmin)

  const handleLogout = () => {
    clearAdmin()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 p-4">
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {admin?.nombre ? (
              <span className="text-sm text-muted-foreground">
                {admin.nombre}
              </span>
            ) : null}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
