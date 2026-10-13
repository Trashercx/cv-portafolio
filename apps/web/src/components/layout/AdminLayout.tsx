import { LogOut } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CargandoPagina } from '@/components/CargandoPagina'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AvisoSesionExpirando } from '@/features/auth/AvisoSesionExpirando'
import { GuardiaNavegacionEditor } from '@/features/editor/navegacion-protegida'
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'
import { PaletaComandos } from '@/features/paleta-comandos/PaletaComandos'
import { ProveedorPaletaComandos } from '@/features/paleta-comandos/contexto-paleta'
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
 * "Cerrar sesión" (Fase 6, UC-01) llama a `POST /auth/logout` vía
 * `useCerrarSesion`: el API borra la cookie httpOnly y, pase lo que pase con
 * la red, el hook limpia el auth store + la caché de TanStack Query y
 * redirige a `/admin/login`.
 *
 * Fase 6 (code splitting): las páginas del panel son `React.lazy`; el
 * `Suspense` interno deja el layout (sidebar/top bar) visible mientras carga
 * el chunk de la página.
 */
export function AdminLayout() {
  const location = useLocation()
  const admin = useAuthStore((state) => state.admin)
  const cerrarSesion = useCerrarSesion()

  // El editor visual (UC-07, fusionado con UC-10/UC-11 en Sprint 7) necesita
  // todo el ancho disponible para el lienzo de Puck: el `max-w-5xl` que el
  // resto de las páginas del panel sí necesita para mantener formularios y
  // tablas legibles termina angostando innecesariamente ese lienzo. Solo
  // esta ruta se libera del límite de ancho; el resto del panel conserva su
  // `max-w-5xl` actual sin cambios.
  const esRutaDeAnchoCompleto = location.pathname.startsWith('/admin/editor')

  // El lienzo de Puck (Fase 3.1) necesita el máximo ancho horizontal
  // posible: la sidebar se colapsa automáticamente al entrar a
  // `/admin/editor` (reusando `esRutaDeAnchoCompleto`) y se reabre al salir.
  // Controlada (no `defaultOpen`) porque `AdminLayout` no se remonta entre
  // rutas — un `defaultOpen` solo se leería una vez, al primer montaje del
  // panel. El admin igual puede reabrirla a mano con `SidebarTrigger`
  // mientras sigue en el editor: el `useEffect` solo reacciona a *cambios*
  // de `esRutaDeAnchoCompleto` (navegación), no en cada render.
  const [sidebarAbierta, setSidebarAbierta] = useState(!esRutaDeAnchoCompleto)

  useEffect(() => {
    setSidebarAbierta(!esRutaDeAnchoCompleto)
  }, [esRutaDeAnchoCompleto])

  const handleLogout = () => {
    cerrarSesion.mutate()
  }

  return (
    <ThemeProvider>
      <ProveedorPaletaComandos>
        <PaletaComandos />
        <AvisoSesionExpirando />
        <GuardiaNavegacionEditor />
        <SidebarProvider open={sidebarAbierta} onOpenChange={setSidebarAbierta}>
          <AppSidebar />
          <SidebarInset>
            {/* Fase 7 (UC-07): alto fijo de 3.5rem (`h-14`), del que depende el cálculo de
                alto del editor (`EditorSeccionesPage`: `100dvh - 3.5rem`); compacto en
                móvil: nombre truncado y botón de cerrar sesión solo con icono. */}
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
              <SidebarTrigger />
              <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <div className="h-6 w-px shrink-0 bg-border" />
                {admin?.nombre ? (
                  <span className="hidden max-w-[10rem] truncate text-sm text-muted-foreground sm:inline">
                    {admin.nombre}
                  </span>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Cerrar sesión"
                  onClick={handleLogout}
                  disabled={cerrarSesion.isPending}
                >
                  <LogOut />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </Button>
              </div>
            </header>
            <main
              className={cn(
                'p-4',
                esRutaDeAnchoCompleto ? 'w-full' : 'mx-auto w-full max-w-5xl',
              )}
            >
              <Suspense fallback={<CargandoPagina className="min-h-[50svh]" />}>
                <Outlet />
              </Suspense>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ProveedorPaletaComandos>
    </ThemeProvider>
  )
}
