import {
  Award,
  BadgeCheck,
  BarChart3,
  Briefcase,
  ExternalLink,
  Image,
  LayoutGrid,
  LogOut,
  Moon,
  Share2,
  Sparkles,
  Trophy,
  User,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavegarProtegido } from '@/features/editor/navegacion-protegida'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from '@/components/ui/command'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useAuthStore } from '@/store/auth-store'
import { useComandosActivos } from '@/features/paleta-comandos/contexto-paleta'

type RutaAdmin = { to: string; label: string; icon: LucideIcon }

/**
 * Mismas rutas admin que `AppSidebar` (Fase 3.5) — ver su comentario de
 * cabecera para el detalle por grupo. Fase 5 (panel unificado): "Tema" y
 * "Fondo del sitio" ya no son rutas propias (se fusionaron como pestañas del
 * panel lateral de "Editor visual"), así que se sacaron de esta lista.
 */
const RUTAS_ADMIN: RutaAdmin[] = [
  { to: '/admin/perfil', label: 'Perfil', icon: User },
  { to: '/admin/proyectos', label: 'Proyectos', icon: LayoutGrid },
  { to: '/admin/certificaciones', label: 'Certificaciones', icon: BadgeCheck },
  // Fase 7d (UC-35).
  { to: '/admin/insignias', label: 'Insignias', icon: Award },
  // Fase 7l (UC-19).
  { to: '/admin/experiencias', label: 'Experiencia', icon: Briefcase },
  { to: '/admin/logros', label: 'Logros', icon: Trophy },
  { to: '/admin/skills', label: 'Skills', icon: Sparkles },
  { to: '/admin/redes', label: 'Redes sociales', icon: Share2 },
  { to: '/admin/editor', label: 'Editor visual', icon: Wand2 },
  { to: '/admin/media', label: 'Biblioteca de medios', icon: Image },
  { to: '/admin/metricas', label: 'Métricas', icon: BarChart3 },
]

/**
 * Paleta de comandos del panel admin (Fase 3.5, `Ctrl+K`/`⌘K`): navegar a
 * cualquier ruta admin o al sitio público, disparar acciones globales
 * (cambiar tema, cerrar sesión) y, si la página actual registró alguno vía
 * `useComandosContextuales`, sus comandos propios.
 *
 * El listener de teclado es global (`document`), pero eso es seguro incluso
 * dentro de `/admin/editor`: el lienzo de Puck se monta con
 * `iframe={{ enabled: true }}` (ver `EditorSeccionesPage`), así que mientras
 * el foco está dentro del iframe del lienzo, sus eventos de teclado ocurren
 * en el `document` del iframe y nunca burbujean al `document` del panel
 * — no hay overlap real con los atajos internos de Puck. Cuando el foco SÍ
 * está en el `document` padre (fuera del lienzo: sidebar, header, campos de
 * un formulario), `Ctrl+K` abre la paleta como en cualquier otra página.
 */
export function PaletaComandos() {
  const [abierta, setAbierta] = useState(false)
  const navigate = useNavigate()
  // Fase 7 (UC-08): ir a otra página desde el editor con cambios sin guardar
  // pide confirmación (`navigate` directo solo se usa al cerrar sesión).
  const { navegar } = useNavegarProtegido()
  const { toggleTheme } = useTheme()
  const clearAdmin = useAuthStore((state) => state.clearAdmin)
  const comandosContextuales = useComandosActivos()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setAbierta((actual) => !actual)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const ejecutar = (accion: () => void) => {
    setAbierta(false)
    accion()
  }

  const irA = (ruta: string) => ejecutar(() => navegar(ruta))
  const irAlSitioPublico = () =>
    ejecutar(() => window.open('/', '_blank', 'noopener,noreferrer'))
  const cerrarSesion = () =>
    ejecutar(() => {
      clearAdmin()
      navigate('/admin/login', { replace: true })
    })

  return (
    <CommandDialog open={abierta} onOpenChange={setAbierta}>
      <CommandInput placeholder="Buscá una página o acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Navegar">
          {RUTAS_ADMIN.map((ruta) => (
            <CommandItem
              key={ruta.to}
              value={ruta.label}
              onSelect={() => irA(ruta.to)}
            >
              <ruta.icon />
              <span>{ruta.label}</span>
            </CommandItem>
          ))}
          <CommandItem value="Ver sitio público" onSelect={irAlSitioPublico}>
            <ExternalLink />
            <span>Ver sitio público</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Acciones">
          <CommandItem
            value="Cambiar tema"
            onSelect={() => ejecutar(toggleTheme)}
          >
            <Moon />
            <span>Cambiar tema</span>
          </CommandItem>
          <CommandItem value="Cerrar sesión" onSelect={cerrarSesion}>
            <LogOut />
            <span>Cerrar sesión</span>
          </CommandItem>
        </CommandGroup>
        {comandosContextuales.length > 0 ? (
          <CommandGroup heading="Página actual">
            {comandosContextuales.map((comando) => (
              <CommandItem
                key={comando.id}
                value={comando.etiqueta}
                onSelect={() => ejecutar(comando.accion)}
              >
                <span>{comando.etiqueta}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
