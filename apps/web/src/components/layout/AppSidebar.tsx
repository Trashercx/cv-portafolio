import {
  BadgeCheck,
  Image,
  LayoutGrid,
  Palette,
  Share2,
  Sparkles,
  Trophy,
  User,
  Wand2,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const NAV_ITEMS: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: '/admin/perfil', label: 'Perfil', icon: User },
  { to: '/admin/proyectos', label: 'Proyectos', icon: LayoutGrid },
  { to: '/admin/certificaciones', label: 'Certificaciones', icon: BadgeCheck },
  { to: '/admin/logros', label: 'Logros', icon: Trophy },
  { to: '/admin/redes', label: 'Redes sociales', icon: Share2 },
  { to: '/admin/skills', label: 'Skills', icon: Sparkles },
  { to: '/admin/editor', label: 'Editor visual', icon: Wand2 },
  { to: '/admin/tema', label: 'Tema', icon: Palette },
  { to: '/admin/fondo', label: 'Fondo del sitio', icon: Waves },
  { to: '/admin/media', label: 'Biblioteca de medios', icon: Image },
]

/**
 * Navegación lateral del panel admin (bloque oficial shadcn `Sidebar`,
 * colapsable a solo-íconos en desktop y `Sheet` en mobile vía
 * `collapsible="offcanvas"` por defecto). Las 8 entradas originales
 * (UC-02 a UC-09) más "Skills" (UC-16) y "Fondo del sitio" (UC-15).
 */
export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            P
          </div>
          <span className="font-heading text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Panel
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <NavLink to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
