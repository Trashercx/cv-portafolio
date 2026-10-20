import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { cn } from '@/lib/utils'
import { useModoRenderizado } from './contexto-renderizado'

/** Textos accesibles del carrusel (cada bloque los da en su idioma y género). */
export type EtiquetasCarrusel = {
  anterior: string
  siguiente: string
  pausar: string
  reanudar: string
  irA: (numero: number) => string
}

type CarruselBaseProps = {
  /** Un nodo por diapositiva. */
  items: ReactNode[]
  /** Clases del ancho de cada diapositiva (el `snap-center` lo pone esta base). */
  claseItem: string
  /** Separación entre diapositivas (`gap-*`). */
  gap: string
  automatico: boolean
  intervaloSegundos: number
  etiquetas: EtiquetasCarrusel
  /** Clases extra del contenedor con scroll (p. ej. aire vertical para `elevar`). */
  claseDesplazable?: string
}

/**
 * Carrusel con scroll-snap horizontal nativo (Fase 7l, UC-35; extraído de
 * `CarouselGaleria` de la Fase 7j, UC-18): flechas prev/next con `scrollBy`,
 * puntos derivados del ítem más cercano al `scrollLeft` y avance automático
 * opcional que se pausa al pasar el cursor, al enfocar, con la pestaña oculta
 * o con el botón de pausa (WCAG 2.2.2). Nunca avanza solo en el lienzo del
 * editor ni con movimiento reducido.
 */
export function CarruselBase({
  items,
  claseItem,
  gap,
  automatico,
  intervaloSegundos,
  etiquetas,
  claseDesplazable,
}: CarruselBaseProps) {
  const prefiereReducido = usePrefiereMovimientoReducido()
  const modo = useModoRenderizado()
  const comportamiento: ScrollBehavior = prefiereReducido ? 'auto' : 'smooth'
  const total = items.length

  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [interaccion, setInteraccion] = useState(false)
  const [pausadoPorUsuario, setPausadoPorUsuario] = useState(false)

  const autoDisponible = automatico && !prefiereReducido && modo !== 'editor' && total > 1
  const avanzando = autoDisponible && !interaccion && !pausadoPorUsuario

  /** El scroll ya no puede avanzar más (en pantallas anchas el último ítem nunca llega al borde izquierdo). */
  function estaAlFinal(contenedor: HTMLDivElement): boolean {
    return contenedor.scrollLeft + contenedor.clientWidth >= contenedor.scrollWidth - 2
  }

  function manejarScroll() {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    if (total > 1 && contenedor.scrollLeft > 0 && estaAlFinal(contenedor)) {
      setIndiceActivo(total - 1)
      return
    }
    let indiceMasCercano = 0
    let distanciaMinima = Infinity
    itemRefs.current.forEach((item, indice) => {
      if (!item) return
      const distancia = Math.abs(item.offsetLeft - contenedor.scrollLeft)
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia
        indiceMasCercano = indice
      }
    })
    setIndiceActivo(indiceMasCercano)
  }

  function irA(indice: number) {
    const contenedor = contenedorRef.current
    const item = itemRefs.current[indice]
    if (!contenedor || !item) return
    contenedor.scrollTo({ left: item.offsetLeft, behavior: comportamiento })
  }

  function mover(sentido: 1 | -1) {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    contenedor.scrollBy({ left: sentido * contenedor.clientWidth, behavior: comportamiento })
  }

  // Avance automático: avanza un ítem y, si el scroll ya no puede avanzar,
  // vuelve al primero. Lee la posición del DOM en cada tic.
  useEffect(() => {
    if (!avanzando) return
    const intervalo = window.setInterval(() => {
      const contenedor = contenedorRef.current
      if (document.hidden || !contenedor) return
      if (estaAlFinal(contenedor)) {
        contenedor.scrollTo({ left: 0, behavior: comportamiento })
        return
      }
      const siguienteItem = itemRefs.current.find(
        (item) => item !== null && item.offsetLeft > contenedor.scrollLeft + 2,
      )
      contenedor.scrollTo({ left: siguienteItem?.offsetLeft ?? 0, behavior: comportamiento })
    }, intervaloSegundos * 1000)
    return () => window.clearInterval(intervalo)
  }, [avanzando, intervaloSegundos, comportamiento])

  return (
    <div
      className="relative min-w-0"
      data-disposicion="carousel"
      data-automatico={autoDisponible ? (avanzando ? 'avanzando' : 'pausado') : undefined}
      onPointerEnter={() => setInteraccion(true)}
      onPointerLeave={() => setInteraccion(false)}
      onFocus={() => setInteraccion(true)}
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setInteraccion(false)
      }}
    >
      <div
        ref={contenedorRef}
        onScroll={manejarScroll}
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto scroll-smooth',
          gap,
          claseDesplazable,
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          prefiereReducido && 'scroll-auto',
        )}
      >
        {items.map((nodo, indice) => (
          <div
            key={indice}
            ref={(elemento) => {
              itemRefs.current[indice] = elemento
            }}
            className={cn('shrink-0 snap-center', claseItem)}
          >
            {nodo}
          </div>
        ))}
      </div>
      {total > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-2 -translate-y-1/2"
            onClick={() => mover(-1)}
            aria-label={etiquetas.anterior}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={() => mover(1)}
            aria-label={etiquetas.siguiente}
          >
            <ChevronRight className="size-4" />
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2">
            {autoDisponible ? (
              <button
                type="button"
                onClick={() => setPausadoPorUsuario((valor) => !valor)}
                aria-label={pausadoPorUsuario ? etiquetas.reanudar : etiquetas.pausar}
                className="mr-1 grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {pausadoPorUsuario ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </button>
            ) : null}
            {items.map((_, indice) => (
              <button
                key={`dot-${indice}`}
                type="button"
                aria-label={etiquetas.irA(indice + 1)}
                aria-current={indice === indiceActivo}
                onClick={() => irA(indice)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  indice === indiceActivo ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
