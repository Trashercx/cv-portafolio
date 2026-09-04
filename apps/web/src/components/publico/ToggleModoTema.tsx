import { Moon, Sun } from 'lucide-react'
import { useModoTema } from '@/hooks/useModoTema'
import { cn } from '@/lib/utils'

type ToggleModoTemaProps = {
  /** Clases adicionales, mergeadas con `cn()` sobre las que ya trae el botón. */
  className?: string
}

/**
 * Toggle de modo claro/oscuro del SITIO PÚBLICO (Fase 4.6, UC-12) — no
 * confundir con `ThemeToggle` del panel admin (`components/theme/`), que
 * alterna un sistema de chrome completamente independiente. Elegir acá deja
 * un override persistente (`useModoTema`) que gana sobre
 * `prefers-color-scheme` del sistema.
 *
 * Botón simple (no `Switch`, para no depender de un componente shadcn extra
 * en el árbol público) que alterna el modo actualmente resuelto; el ícono
 * mostrado es el del modo ACTUAL (sol visible en claro invita a pasar a
 * oscuro, luna visible en oscuro invita a pasar a claro) — corregido en la
 * 5ta ronda, antes estaba al revés de lo que este mismo comentario ya decía.
 *
 * Montado como botón flotante fijo en `PublicHomePage` (fix de visibilidad,
 * Fase 4.7): `className` permite agregar `shadow-lg`/posicionamiento desde
 * ahí sin acoplar este componente a un layout fijo, y el fondo sólido inline
 * (`--color-fondo`) evita que se lea transparente sobre el contenido al
 * flotar.
 */
export function ToggleModoTema({ className }: ToggleModoTemaProps = {}) {
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
      style={{ backgroundColor: 'var(--color-fondo)' }}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border text-current transition-colors hover:bg-[var(--color-primario)]/10',
        className,
      )}
    >
      {esOscuro ? (
        <Moon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4" aria-hidden="true" />
      )}
    </button>
  )
}
