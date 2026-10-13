import {
  BadgeCheck,
  ExternalLink,
  Image,
  LayoutGrid,
  Share2,
  Sparkles,
  Trophy,
  User,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useNavegarProtegido } from '@/features/editor/navegacion-protegida'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type NavItem = { to: string; label: string; icon: LucideIcon }

/**
 * Los mismos ítems de siempre (UC-02 a UC-09, más "Skills" UC-16), agrupados
 * en 3 secciones (Fase 3.5) para que la sidebar sea escaneable de un
 * vistazo: "Contenido" (las 6 entidades de negocio que edita el admin),
 * "Diseño" (todo lo que afecta la apariencia del sitio publicado) y
 * "Recursos" (la biblioteca de medios, transversal a las anteriores).
 *
 * Fase 5 (panel unificado): "Tema" (UC-08) y "Fondo del sitio" (UC-15) ya no
 * son páginas propias — se fusionaron como pestañas del panel lateral de
 * "Editor visual" (ver `PanelTemaEditor`/`PanelFondoEditor` en
 * `EditorSeccionesPage`) — así que el grupo "Diseño" queda con un solo
 * ítem. Las rutas `/admin/tema`/`/admin/fondo` siguen existiendo en
 * `App.tsx` como redirects, para no romper enlaces guardados.
 */
const GRUPOS_NAV: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Contenido',
    items: [
      { to: '/admin/perfil', label: 'Perfil', icon: User },
      { to: '/admin/proyectos', label: 'Proyectos', icon: LayoutGrid },
      {
        to: '/admin/certificaciones',
        label: 'Certificaciones',
        icon: BadgeCheck,
      },
      { to: '/admin/logros', label: 'Logros', icon: Trophy },
      { to: '/admin/skills', label: 'Skills', icon: Sparkles },
      { to: '/admin/redes', label: 'Redes sociales', icon: Share2 },
    ],
  },
  {
    label: 'Diseño',
    items: [{ to: '/admin/editor', label: 'Editor visual', icon: Wand2 }],
  },
  {
    label: 'Recursos',
    items: [{ to: '/admin/media', label: 'Biblioteca de medios', icon: Image }],
  },
]

/**
 * Compara por límite de segmento de ruta, no por prefijo de texto crudo:
 * `startsWith(item.to)` a secas marcaría también activo un ítem como
 * `/admin/tema` ante una futura ruta `/admin/tema-avanzado`, que comparte
 * prefijo de texto sin ser realmente una sub-ruta.
 */
function esRutaActiva(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * Navegación lateral del panel admin (bloque oficial shadcn `Sidebar`,
 * colapsable a solo-íconos en desktop y `Sheet` en mobile vía
 * `collapsible="offcanvas"` por defecto). Agrupada en 3 secciones (Fase 3.5)
 * más un link de salida al sitio público en el pie.
 */
export function AppSidebar() {
  const location = useLocation()
  // Fase 7 (UC-08): salir del editor con cambios sin guardar pide confirmación.
  const { interceptarClick } = useNavegarProtegido()

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
        {GRUPOS_NAV.map((grupo) => (
          <SidebarGroup key={grupo.label}>
            <SidebarGroupLabel>{grupo.label}</SidebarGroupLabel>
            <SidebarMenu>
              {grupo.items.map((item) => {
                const isActive = esRutaActiva(location.pathname, item.to)
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <NavLink
                        to={item.to}
                        onClick={(event) => interceptarClick(event, item.to)}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ver sitio público">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                <span>Ver sitio público</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
