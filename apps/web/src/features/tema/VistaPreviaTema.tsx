import { temaComoVariablesCss, type TemaColores } from '@/lib/tema-css'
import type { ModoTema } from '@/lib/tema-oscuro'
import { cn } from '@/lib/utils'
import { useFuenteTema } from './useFuenteTema'

type VistaPreviaTemaProps = {
  /** Colores y fuente a pintar: en el formulario son los valores en vivo. */
  tema: TemaColores
  modo: ModoTema
}

/**
 * Mini-sitio de muestra (Fase 7, UC-08) para el formulario de tema: un hero
 * con título, subtítulo y botón primario, una tarjeta y un texto secundario,
 * pintados con las mismas variables CSS que el sitio real
 * (`temaComoVariablesCss`), sin ningún color propio. El formulario lo
 * renderiza dos veces (claro y oscuro) para ver de un vistazo cómo queda la
 * paleta derivada de cada modo.
 *
 * El botón replica el del hero real (`BloqueHero`: fondo `--color-primario`,
 * texto `--color-texto`), de modo que un primario con poco contraste contra
 * el texto se vea aquí tal como se vería publicado.
 *
 * El contenedor lleva `dark` en oscuro y `forzar-claro` en claro (ver
 * `index.css`): el panel puede estar en cualquiera de los dos modos y cada
 * muestra debe verse en el suyo, no en el del panel.
 */
export function VistaPreviaTema({ tema, modo }: VistaPreviaTemaProps) {
  useFuenteTema(tema.fuente_principal)

  return (
    <div
      data-testid={`vista-previa-tema-${modo}`}
      style={temaComoVariablesCss(tema, modo)}
      className={cn(
        'grid gap-3 rounded-lg border p-3',
        modo === 'oscuro' ? 'dark' : 'forzar-claro',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {modo === 'oscuro' ? 'Modo oscuro' : 'Modo claro'}
      </p>
      <div className="grid gap-1">
        <h4
          className="text-xl leading-tight font-bold"
          style={{ color: 'var(--color-texto)' }}
        >
          Tu nombre aquí
        </h4>
        <p className="text-xs" style={{ color: 'var(--color-texto)' }}>
          Desarrollador y creador de proyectos
        </p>
        <span
          className="mt-1 w-fit rounded-md px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-primario)',
            color: 'var(--color-texto)',
          }}
        >
          Botón primario
        </span>
      </div>
      <div className="grid gap-1 rounded-md border bg-card p-2 text-xs text-card-foreground">
        <p className="font-semibold">Título de una tarjeta</p>
        <p className="text-muted-foreground">Texto secundario de apoyo.</p>
      </div>
    </div>
  )
}
