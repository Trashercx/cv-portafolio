import { LogOut } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

/**
 * Layout de administración: sidebar colapsable (UC-02 a UC-09) + top bar
 * sticky con el trigger de la sidebar, el toggle de tema del panel y el
 * botón de cerrar sesión.
 *
 * Publicación (UC-10, UC-11) ya no tiene una entrada de navegación ni ruta
 * propias (Sprint 7): se fusionó dentro de "Editor visual"
 * (`EditorSeccionesPage`) para eliminar la navegación redundante entre
 * "estructura" y "publicación" que eran, en la práctica, un solo flujo de
 * trabajo. `/admin/publicacion` sigue existiendo como redirect en `App.tsx`
 * por compatibilidad con enlaces ya guardados.
 *
 * "Cerrar sesión" en Sprint 2 solo limpia el auth store (en memoria) y
 * redirige a `/admin/login` — no hay endpoint de logout real en el backend
 * todavía (la sesión sigue siendo válida server-side hasta que expire la
 * cookie). Pendiente: agregar `POST /auth/logout` que invalide la cookie
 * del lado del servidor antes de producción.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const admin = useAuthStore((state) => state.admin)
  const clearAdmin = useAuthStore((state) => state.clearAdmin)

  // El editor visual (UC-07, fusionado con UC-10/UC-11 en Sprint 7) necesita
  // todo el ancho disponible para el lienzo de Puck: el `max-w-5xl` que el
  // resto de las páginas del panel sí necesita para mantener formularios y
  // tablas legibles termina angostando innecesariamente ese lienzo. Solo
  // esta ruta se libera del límite de ancho; el resto del panel conserva su
  // `max-w-5xl` actual sin cambios.
  const esRutaDeAnchoCompleto = location.pathname.startsWith('/admin/editor')

  const handleLogout = () => {
    clearAdmin()
    navigate('/admin/login', { replace: true })
  }

  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background p-4">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="h-6 w-px bg-border" />
              {admin?.nombre ? (
                <span className="text-sm text-muted-foreground">
                  {admin.nombre}
                </span>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut />
                Cerrar sesión
              </Button>
            </div>
          </header>
          <main
            className={cn(
              'p-4',
              esRutaDeAnchoCompleto ? 'w-full' : 'mx-auto w-full max-w-5xl',
            )}
          >
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  )
}
