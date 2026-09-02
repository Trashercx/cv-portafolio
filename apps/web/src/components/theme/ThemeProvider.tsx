import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'panel-admin-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function leerThemeGuardado(): Theme {
  if (typeof window === 'undefined') return 'light'
  const guardado = window.localStorage.getItem(STORAGE_KEY)
  return guardado === 'dark' ? 'dark' : 'light'
}

/**
 * Tema visual del *chrome* del panel admin (shadcn, clase `.dark` en
 * `<html>`), independiente del módulo de negocio "Tema" (`features/tema/`,
 * tabla `tema`) que solo afecta al sitio público vía `lib/tema-css.ts`. Solo
 * envuelve `<AdminLayout>` en `App.tsx`, nunca las páginas públicas.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => leerThemeGuardado())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // `ThemeProvider` solo envuelve `AdminLayout`: se monta/desmonta al
  // entrar/salir de `/admin/*`. Sin este cleanup, si el admin activa modo
  // oscuro y navega al sitio público, `.dark` queda pegado en `<html>`
  // indefinidamente y se filtra a los componentes shadcn compartidos
  // (botones, inputs, etc.) que sí tienen variantes `dark:`.
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const setTheme = (nextTheme: Theme) => setThemeState(nextTheme)
  const toggleTheme = () =>
    setThemeState((actual) => (actual === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>.')
  }
  return context
}
