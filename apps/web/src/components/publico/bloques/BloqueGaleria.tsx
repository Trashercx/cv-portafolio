import { lazy, Suspense, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GaleriaConfiguracion } from '@/features/secciones/types'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { EFECTO_HOVER_GALERIA_CLASE } from '@/lib/efectos-hover'
import { COLUMNAS_GRID_CLASE } from '@/lib/escalas-bloque'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { ImagenResponsive } from '../ImagenResponsive'
import { TarjetaClicable } from '../contexto-renderizado'

// Fase 8 (8.3, UC-34): el Lightbox (Radix Dialog) se descarga al primer clic.
const Lightbox = lazy(() =>
  import('../Lightbox').then((m) => ({ default: m.Lightbox })),
)

type BloqueGaleriaProps = {
  titulo: string
  config: GaleriaConfiguracion
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/** Bloque `galeria` (UC-18, Fase 4.5), compartido entre el sitio público y el lienzo del editor de Puck. */
export function BloqueGaleria({ titulo, config, alineacionTitulo }: BloqueGaleriaProps) {
  const fotos = config.fotos ?? []
  const disposicion = config.disposicion ?? 'carousel'
  const columnasGrid = config.columnas_grid ?? 3
  // Fase 7 (7.3, UC-12): `efecto_hover` (default 'zoom', el `scale-105` de siempre).
  const efecto = EFECTO_HOVER_GALERIA_CLASE[config.efecto_hover ?? 'zoom']

  const [lightboxAbierto, setLightboxAbierto] = useState(false)
  const [lightboxMontado, setLightboxMontado] = useState(false)
  const [indiceLightbox, setIndiceLightbox] = useState(0)

  function abrirLightbox(indice: number) {
    setIndiceLightbox(indice)
    setLightboxMontado(true)
    setLightboxAbierto(true)
  }

  return (
    <div className="grid gap-6">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {fotos.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay fotos.</p>
      ) : disposicion === 'grid' ? (
        <div className={cn('grid gap-4', COLUMNAS_GRID_CLASE[columnasGrid])}>
          {fotos.map((foto, indice) => (
            <TarjetaClicable
              key={`${foto.media_id}-${indice}`}
              onClick={() => abrirLightbox(indice)}
              aria-label={foto.titulo || 'Ver foto'}
              className={cn('overflow-hidden rounded-lg', efecto.tarjeta)}
            >
              <ImagenResponsive
                media={foto.media}
                alt={foto.titulo || foto.media?.alt_text || ''}
                sizes={SIZES_POR_CONTEXTO.galeria}
                className={cn('aspect-square w-full object-cover', efecto.imagen)}
              />
            </TarjetaClicable>
          ))}
        </div>
      ) : (
        <CarouselGaleria fotos={fotos} onAbrirFoto={abrirLightbox} efecto={efecto} />
      )}
      {lightboxMontado ? (
        <Suspense fallback={null}>
          <Lightbox
            fotos={fotos}
            indiceInicial={indiceLightbox}
            open={lightboxAbierto}
            onOpenChange={setLightboxAbierto}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

type CarouselGaleriaProps = {
  fotos: GaleriaConfiguracion['fotos']
  onAbrirFoto: (indice: number) => void
  efecto: (typeof EFECTO_HOVER_GALERIA_CLASE)[keyof typeof EFECTO_HOVER_GALERIA_CLASE]
}

/**
 * `disposicion='carousel'` (default de UC-18): scroll-snap horizontal nativo
 * en vez de una librería de carousel nueva (mismo criterio ya aplicado en
 * fases anteriores) — flechas prev/next con `scrollBy`, dots derivados del
 * ítem más cercano al `scrollLeft` actual (robusto sin importar el ancho
 * responsive de cada ítem, a diferencia de calcular el índice por proporción
 * del scroll total).
 */
function CarouselGaleria({ fotos, onAbrirFoto, efecto }: CarouselGaleriaProps) {
  const prefiereReducido = usePrefiereMovimientoReducido()
  const comportamiento: ScrollBehavior = prefiereReducido ? 'auto' : 'smooth'

  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [indiceActivo, setIndiceActivo] = useState(0)

  function manejarScroll() {
    const contenedor = contenedorRef.current
    if (!contenedor) return
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

  function anterior() {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    contenedor.scrollBy({ left: -contenedor.clientWidth, behavior: comportamiento })
  }

  function siguiente() {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    contenedor.scrollBy({ left: contenedor.clientWidth, behavior: comportamiento })
  }

  return (
    <div className="relative">
      <div
        ref={contenedorRef}
        onScroll={manejarScroll}
        className={cn(
          'flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth',
          // `elevar` sube 4 px y proyecta sombra: este contenedor recorta en
          // vertical (`overflow-x-auto`), así que se le da aire arriba y abajo.
          efecto.tarjeta && '-my-3 py-3',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          prefiereReducido && 'scroll-auto',
        )}
      >
        {fotos.map((foto, indice) => (
          <div
            key={`${foto.media_id}-${indice}`}
            ref={(elemento) => {
              itemRefs.current[indice] = elemento
            }}
            className="w-full shrink-0 snap-center sm:w-2/3 lg:w-1/2"
          >
            <TarjetaClicable
              onClick={() => onAbrirFoto(indice)}
              aria-label={foto.titulo || 'Ver foto'}
              className={cn('block w-full overflow-hidden rounded-lg', efecto.tarjeta)}
            >
              <ImagenResponsive
                media={foto.media}
                alt={foto.titulo || foto.media?.alt_text || ''}
                sizes={SIZES_POR_CONTEXTO.galeria}
                className={cn('aspect-video w-full object-cover', efecto.imagen)}
              />
            </TarjetaClicable>
          </div>
        ))}
      </div>
      {fotos.length > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-2 -translate-y-1/2"
            onClick={anterior}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={siguiente}
            aria-label="Foto siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
          <div className="mt-4 flex justify-center gap-2">
            {fotos.map((foto, indice) => (
              <button
                key={`dot-${foto.media_id}-${indice}`}
                type="button"
                aria-label={`Ir a la foto ${indice + 1}`}
                aria-current={indice === indiceActivo}
                onClick={() => irA(indice)}
                className={cn(
                  'size-2 rounded-full transition-colors',
                  indice === indiceActivo ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
