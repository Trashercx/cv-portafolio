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
 *
 * Séptima ronda: el `title` nativo tardaba y se veía poco, así que se
 * reemplazó por una etiqueta propia sobre el botón (visible en hover/foco).
 * No se usa el `Tooltip` de shadcn porque portalea a `<body>`, fuera del
 * contenedor raíz que lleva la clase `dark` y las variables CSS del tema; la
 * etiqueta vive dentro del mismo árbol y hereda `--color-fondo`/`--color-texto`.
 * Es `aria-hidden`: el `aria-label` del botón ya cubre la accesibilidad.
 */
export function ToggleModoTema({ className }: ToggleModoTemaProps = {}) {
  const { modo, setModo } = useModoTema()
  const esOscuro = modo === 'oscuro'

  const etiqueta = esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <div className="group relative inline-flex">
      <span
        aria-hidden="true"
        style={{
          backgroundColor: 'var(--color-fondo)',
          color: 'var(--color-texto)',
        }}
        className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {etiqueta}
      </span>
      <button
        type="button"
        onClick={() => setModo(esOscuro ? 'claro' : 'oscuro')}
        aria-label={etiqueta}
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
    </div>
  )
}
