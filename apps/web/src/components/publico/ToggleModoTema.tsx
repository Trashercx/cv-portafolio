import { Moon, Sun } from 'lucide-react'
import { useModoTema } from '@/hooks/useModoTema'

/**
 * Toggle de modo claro/oscuro del SITIO PÚBLICO (Fase 4.6, UC-12) — no
 * confundir con `ThemeToggle` del panel admin (`components/theme/`), que
 * alterna un sistema de chrome completamente independiente. Elegir acá deja
 * un override persistente (`useModoTema`) que gana sobre
 * `prefers-color-scheme` del sistema.
 *
 * Botón simple (no `Switch`, para no depender de un componente shadcn extra
 * en el árbol público) que alterna el modo actualmente resuelto; el ícono
 * mostrado es el del modo AL QUE SE PASARÍA al hacer click (mismo patrón que
 * `ThemeToggle`: sol visible en claro invita a pasar a oscuro y viceversa).
 */
export function ToggleModoTema() {
  const { modo, setModo } = useModoTema()
  const esOscuro = modo === 'oscuro'

  return (
    <button
      type="button"
      onClick={() => setModo(esOscuro ? 'claro' : 'oscuro')}
      aria-label={
        esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
      }
      title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="inline-flex size-9 items-center justify-center rounded-full border text-current transition-colors hover:bg-[var(--color-primario)]/10"
    >
      {esOscuro ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  )
}
