import { useState, type CSSProperties, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { cn } from '@/lib/utils'
import { useModoRenderizado } from './contexto-renderizado'

type CintaBaseProps = {
  /** Segundos de una vuelta completa (variable `--duracion-cinta`). */
  duracionSegundos: number
  /** Clases de cada vuelta (separación y relleno derecho = la misma separación entre ítems). */
  claseVuelta: string
  /** Contenido de una vuelta; `decorativa` es `true` en la copia (fuera de tab y del lector) y `quieta` si no hay animación (lienzo o movimiento reducido). */
  children: (decorativa: boolean, quieta: boolean) => ReactNode
  /** Textos accesibles del botón de pausa. */
  etiquetas: { pausar: string; reanudar: string }
  /** Clases extra del contenedor (p. ej. aire vertical para sombras). */
  claseContenedor?: string
}

/**
 * Cinta continua (Fase 7l, UC-35; extraída de `CintaGaleria` de la Fase 7j,
 * UC-18): tira que se desplaza sola en bucle con CSS (`marquee`, sin JS por
 * fotograma). La pista lleva el contenido dos veces y la segunda vuelta es
 * decorativa. Se pausa al pasar el cursor, al enfocar y con su botón (WCAG
 * 2.2.2); con movimiento reducido o en el lienzo del editor es una tira quieta
 * con scroll manual y una sola vuelta.
 */
export function CintaBase({
  duracionSegundos,
  claseVuelta,
  children,
  etiquetas,
  claseContenedor,
}: CintaBaseProps) {
  const reducido = usePrefiereMovimientoReducido()
  const modo = useModoRenderizado()
  const [pausada, setPausada] = useState(false)
  const quieta = reducido || modo === 'editor'
  const estilo = { '--duracion-cinta': `${duracionSegundos}s` } as CSSProperties
  const vueltas = quieta ? [false] : [false, true]

  return (
    <div className="grid gap-3">
      <div
        data-disposicion="cinta"
        data-pausada={pausada || undefined}
        className={cn(
          'cinta-contenedor relative',
          quieta
            ? 'overflow-x-auto scrollbar-fina'
            : 'overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]',
          claseContenedor,
        )}
      >
        <div
          className={cn('flex w-max', !quieta && 'cinta-pista', pausada && '[animation-play-state:paused]')}
          style={estilo}
        >
          {vueltas.map((decorativa) => (
            <div key={decorativa ? 'copia' : 'original'} className={cn('flex shrink-0', claseVuelta)}>
              {children(decorativa, quieta)}
            </div>
          ))}
        </div>
      </div>
      {quieta ? null : (
        <button
          type="button"
          onClick={() => setPausada((valor) => !valor)}
          aria-label={pausada ? etiquetas.reanudar : etiquetas.pausar}
          className="mx-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:outline-none"
        >
          {pausada ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
      )}
    </div>
  )
}
