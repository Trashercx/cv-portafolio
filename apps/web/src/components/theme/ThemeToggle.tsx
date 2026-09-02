import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useTheme } from './ThemeProvider'

/** Alterna entre modo claro/oscuro del *chrome* del panel admin (ver `ThemeProvider`). */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const esOscuro = theme === 'dark'

  return (
    <div className="flex items-center gap-2">
      <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
      <Switch
        checked={esOscuro}
        onCheckedChange={toggleTheme}
        aria-label="Cambiar entre modo claro y oscuro"
      />
      <Moon className="size-4 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
