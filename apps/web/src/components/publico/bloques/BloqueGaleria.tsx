import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GaleriaConfiguracion, GaleriaFoto } from '@/features/secciones/types'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { EFECTO_HOVER_GALERIA_CLASE } from '@/lib/efectos-hover'
import {
  COLUMNAS_GRID_CLASE,
  COLUMNAS_MASONRY_CLASE,
  ESQUINAS_FOTO_CLASE,
  claseMosaico,
  PROPORCION_FOTO_CLASE,
  SEGUNDOS_POR_FOTO_CINTA,
  SEPARACION_GALERIA_CLASE,
} from '@/lib/escalas-bloque'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaInteractiva } from '../TarjetaInteractiva'
import { TarjetaClicable, useModoRenderizado } from '../contexto-renderizado'
import { TituloBloque } from './TituloBloque'

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

type Efecto = NonNullable<GaleriaConfiguracion['efecto_hover']>
type Proporcion = keyof typeof PROPORCION_FOTO_CLASE
type MostrarTitulos = NonNullable<GaleriaConfiguracion['mostrar_titulos']>

/** Opciones ya resueltas (con los defaults de antes de la Fase 7j). */
type Presentacion = {
  efecto: Efecto
  esquinas: string
  mostrarTitulos: MostrarTitulos
  ampliar: boolean
}

/**
 * Bloque `galeria` (UC-18, Fase 4.5), compartido entre el sitio público y el
 * lienzo del editor de Puck. Fase 7j: cinco disposiciones (carrusel, grilla,
 * mosaico, masonry y cinta), proporción, separación, esquinas, títulos sobre
 * la foto, aparición escalonada, carrusel automático y efecto en grises o
 * inclinación. Toda clave ausente conserva el aspecto previo.
 */
export function BloqueGaleria({ titulo, config, alineacionTitulo }: BloqueGaleriaProps) {
  const fotos = config.fotos ?? []
  const disposicion = config.disposicion ?? 'carousel'
  /** Proporción elegida, o `fallback` (la de antes) si es automática o falta. */
  const proporcionO = (fallback: Proporcion): Proporcion =>
    config.proporcion && config.proporcion !== 'automatica' ? config.proporcion : fallback
  const separacion = SEPARACION_GALERIA_CLASE[config.separacion ?? 'normal']
  const presentacion: Presentacion = {
    efecto: config.efecto_hover ?? 'zoom',
    esquinas: ESQUINAS_FOTO_CLASE[config.esquinas ?? 'suaves'],
    mostrarTitulos: config.mostrar_titulos ?? 'nunca',
    ampliar: config.ampliar_al_clic ?? true,
  }
  const variante =
    config.aparicion_fotos === 'escalonada'
      ? 'deslizar_arriba'
      : config.aparicion_fotos === 'zoom_suave'
        ? 'escalar'
        : null

  const [lightboxAbierto, setLightboxAbierto] = useState(false)
  const [lightboxMontado, setLightboxMontado] = useState(false)
  const [indiceLightbox, setIndiceLightbox] = useState(0)

  function abrirLightbox(indice: number) {
    if (!presentacion.ampliar) return
    setIndiceLightbox(indice)
    setLightboxMontado(true)
    setLightboxAbierto(true)
  }

  /** Envuelve cada foto con la aparición elegida (apagada en el lienzo y con movimiento reducido). */
  const conAparicion = (indice: number, nodo: ReactNode, className?: string) =>
    variante ? (
      <ItemAnimado key={indice} indice={indice} variante={variante} className={className}>
        {nodo}
      </ItemAnimado>
    ) : (
      <div key={indice} className={className}>
        {nodo}
      </div>
    )

  let contenido: ReactNode
  if (fotos.length === 0) {
    contenido = <p className="text-muted-foreground">Todavía no hay fotos.</p>
  } else if (disposicion === 'grid') {
    const proporcion = proporcionO('cuadrada')
    contenido = (
      <div
        data-disposicion="grid"
        className={cn('grid', separacion.gap, COLUMNAS_GRID_CLASE[config.columnas_grid ?? 3])}
      >
        {fotos.map((foto, indice) =>
          conAparicion(
            indice,
            <FotoGaleria
              foto={foto}
              indice={indice}
              presentacion={presentacion}
              claseImagen={PROPORCION_FOTO_CLASE[proporcion]}
              onAbrir={abrirLightbox}
            />,
          ),
        )}
      </div>
    )
  } else if (disposicion === 'mosaico') {
    contenido = (
      <div
        data-disposicion="mosaico"
        className={cn(
          'grid grid-flow-dense grid-cols-2 auto-rows-[9rem] sm:grid-cols-4 sm:auto-rows-[11rem]',
          separacion.gap,
        )}
      >
        {fotos.map((foto, indice) =>
          conAparicion(
            indice,
            <FotoGaleria
              foto={foto}
              indice={indice}
              presentacion={presentacion}
              claseContenedor="h-full"
              claseImagen="h-full"
              onAbrir={abrirLightbox}
            />,
            claseMosaico(indice, fotos.length),
          ),
        )}
      </div>
    )
  } else if (disposicion === 'masonry') {
    contenido = (
      <div
        data-disposicion="masonry"
        className={cn(COLUMNAS_MASONRY_CLASE[config.columnas_grid ?? 3], separacion.columnas)}
      >
        {fotos.map((foto, indice) =>
          conAparicion(
            indice,
            <FotoGaleria
              foto={foto}
              indice={indice}
              presentacion={presentacion}
              // Proporción natural de cada foto: sin `aspect-*`.
              claseImagen="h-auto"
              onAbrir={abrirLightbox}
            />,
            cn('break-inside-avoid', separacion.item),
          ),
        )}
      </div>
    )
  } else if (disposicion === 'cinta') {
    contenido = (
      <CintaGaleria
        fotos={fotos}
        presentacion={presentacion}
        proporcion={proporcionO('horizontal')}
        separacion={separacion}
        segundosPorFoto={SEGUNDOS_POR_FOTO_CINTA[config.velocidad_cinta ?? 'normal']}
        onAbrir={abrirLightbox}
      />
    )
  } else {
    contenido = (
      <CarouselGaleria
        fotos={fotos}
        presentacion={presentacion}
        proporcion={proporcionO('panoramica')}
        gap={separacion.gap}
        automatico={config.reproduccion_automatica ?? false}
        intervaloSegundos={config.intervalo_segundos ?? 5}
        onAbrirFoto={abrirLightbox}
      />
    )
  }

  return (
    <div className="grid gap-6">
      <TituloBloque titulo={titulo} alineacion={alineacionTitulo} mostrar={config.mostrar_titulo} />
      {contenido}
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

type FotoGaleriaProps = {
  foto: GaleriaFoto
  indice: number
  presentacion: Presentacion
  claseImagen: string
  claseContenedor?: string
  onAbrir: (indice: number) => void
  /** Copia decorativa (segunda vuelta de la cinta): fuera del orden de tabulación. */
  decorativa?: boolean
}

/** Una foto: efecto al pasar, esquinas, título sobre la imagen y clic para ampliar. */
function FotoGaleria({
  foto,
  indice,
  presentacion,
  claseImagen,
  claseContenedor,
  onAbrir,
  decorativa = false,
}: FotoGaleriaProps) {
  const efecto = EFECTO_HOVER_GALERIA_CLASE[presentacion.efecto]
  const titulo = foto.titulo?.trim()
  const clases = cn(
    'group/foto relative block w-full overflow-hidden text-left outline-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2',
    presentacion.esquinas,
    efecto.tarjeta,
    claseContenedor,
  )
  const imagen = (
    <>
      <ImagenResponsive
        media={foto.media}
        alt={decorativa ? '' : foto.titulo || foto.media?.alt_text || ''}
        sizes={SIZES_POR_CONTEXTO.galeria}
        className={cn('w-full object-cover', claseImagen, efecto.imagen)}
      />
      {titulo && presentacion.mostrarTitulos !== 'nunca' ? (
        <span
          data-titulo-foto={presentacion.mostrarTitulos}
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/30 to-transparent px-3 pt-8 pb-2.5 text-sm font-medium text-white',
            presentacion.mostrarTitulos === 'al_pasar' &&
              'translate-y-2 opacity-0 transition duration-300 group-hover/foto:translate-y-0 group-hover/foto:opacity-100 group-focus-visible/foto:translate-y-0 group-focus-visible/foto:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100',
          )}
        >
          {titulo}
        </span>
      ) : null}
    </>
  )

  const nodo = presentacion.ampliar ? (
    <TarjetaClicable
      onClick={() => onAbrir(indice)}
      aria-label={titulo || 'Ver foto'}
      className={clases}
      {...(decorativa ? { tabIndex: -1, 'aria-hidden': true } : {})}
    >
      {imagen}
    </TarjetaClicable>
  ) : (
    <div className={clases} aria-hidden={decorativa || undefined}>
      {imagen}
    </div>
  )

  // `inclinar`: tilt 3D que sigue al cursor (se degrada a sombra con movimiento reducido).
  return presentacion.efecto === 'inclinar' ? (
    <TarjetaInteractiva efecto="inclinar" className={cn('h-full', presentacion.esquinas)}>
      {nodo}
    </TarjetaInteractiva>
  ) : (
    nodo
  )
}

type CintaGaleriaProps = {
  fotos: GaleriaFoto[]
  presentacion: Presentacion
  proporcion: Proporcion
  separacion: (typeof SEPARACION_GALERIA_CLASE)[keyof typeof SEPARACION_GALERIA_CLASE]
  segundosPorFoto: number
  onAbrir: (indice: number) => void
}

/**
 * `disposicion='cinta'` (Fase 7j): tira continua que se desplaza sola en
 * bucle (CSS, sin JS por fotograma). La pista lleva las fotos dos veces y la
 * segunda vuelta es decorativa para el lector de pantalla y el teclado. Se
 * pausa al pasar el cursor, al enfocar y con su botón (WCAG 2.2.2); con
 * movimiento reducido o en el lienzo del editor es una tira quieta con
 * scroll manual.
 */
function CintaGaleria({
  fotos,
  presentacion,
  proporcion,
  separacion,
  segundosPorFoto,
  onAbrir,
}: CintaGaleriaProps) {
  const reducido = usePrefiereMovimientoReducido()
  const modo = useModoRenderizado()
  const [pausada, setPausada] = useState(false)
  const quieta = reducido || modo === 'editor'
  const estilo = {
    '--duracion-cinta': `${Math.max(12, fotos.length * segundosPorFoto)}s`,
  } as CSSProperties
  const vueltas = quieta ? [false] : [false, true]

  return (
    <div className="grid gap-3">
      <div
        data-disposicion="cinta"
        data-pausada={pausada || undefined}
        className={cn(
          'galeria-cinta relative',
          quieta
            ? 'overflow-x-auto scrollbar-fina'
            : 'overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]',
        )}
      >
        <div
          className={cn(
            'flex w-max',
            !quieta && 'galeria-cinta-pista',
            pausada && '[animation-play-state:paused]',
          )}
          style={estilo}
        >
          {vueltas.map((decorativa) => (
            // El relleno derecho de cada vuelta es la misma separación entre fotos.
            <div
              key={decorativa ? 'copia' : 'original'}
              className={cn('flex shrink-0', separacion.gap, separacion.relleno)}
            >
              {fotos.map((foto, indice) => (
                <div key={`${foto.media_id}-${indice}`} className="w-60 shrink-0 sm:w-72">
                  <FotoGaleria
                    foto={foto}
                    indice={indice}
                    presentacion={presentacion}
                    claseImagen={PROPORCION_FOTO_CLASE[proporcion]}
                    onAbrir={onAbrir}
                    decorativa={decorativa}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {quieta ? null : (
        <button
          type="button"
          onClick={() => setPausada((valor) => !valor)}
          aria-label={pausada ? 'Reanudar la cinta' : 'Pausar la cinta'}
          className="mx-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:outline-none"
        >
          {pausada ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
      )}
    </div>
  )
}

type CarouselGaleriaProps = {
  fotos: GaleriaFoto[]
  presentacion: Presentacion
  proporcion: Proporcion
  gap: string
  automatico: boolean
  intervaloSegundos: number
  onAbrirFoto: (indice: number) => void
}

/**
 * `disposicion='carousel'` (default de UC-18): scroll-snap horizontal nativo
 * en vez de una librería de carousel nueva (mismo criterio ya aplicado en
 * fases anteriores) — flechas prev/next con `scrollBy`, dots derivados del
 * ítem más cercano al `scrollLeft` actual (robusto sin importar el ancho
 * responsive de cada ítem, a diferencia de calcular el índice por proporción
 * del scroll total). Fase 7j: avance automático opcional, que se pausa al
 * pasar el cursor, al enfocar, con la pestaña oculta o con el botón de pausa
 * (WCAG 2.2.2); nunca en el lienzo del editor ni con movimiento reducido.
 */
function CarouselGaleria({
  fotos,
  presentacion,
  proporcion,
  gap,
  automatico,
  intervaloSegundos,
  onAbrirFoto,
}: CarouselGaleriaProps) {
  const prefiereReducido = usePrefiereMovimientoReducido()
  const modo = useModoRenderizado()
  const comportamiento: ScrollBehavior = prefiereReducido ? 'auto' : 'smooth'

  const contenedorRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [interaccion, setInteraccion] = useState(false)
  const [pausadoPorUsuario, setPausadoPorUsuario] = useState(false)

  const autoDisponible = automatico && !prefiereReducido && modo !== 'editor' && fotos.length > 1
  const avanzando = autoDisponible && !interaccion && !pausadoPorUsuario

  /** El scroll ya no puede avanzar más (en pantallas anchas el último ítem nunca llega al borde izquierdo). */
  function estaAlFinal(contenedor: HTMLDivElement): boolean {
    return contenedor.scrollLeft + contenedor.clientWidth >= contenedor.scrollWidth - 2
  }

  function manejarScroll() {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    if (fotos.length > 1 && contenedor.scrollLeft > 0 && estaAlFinal(contenedor)) {
      setIndiceActivo(fotos.length - 1)
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

  // Avance automático: avanza un ítem y, si el scroll ya no puede avanzar,
  // vuelve a la primera foto. Lee la posición del DOM en cada tic (sin refs
  // escritas durante el render).
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
      className="relative"
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
          // `elevar` sube 4 px y proyecta sombra: este contenedor recorta en
          // vertical (`overflow-x-auto`), así que se le da aire arriba y abajo.
          (presentacion.efecto === 'elevar' || presentacion.efecto === 'inclinar') && '-my-3 py-3',
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
            <FotoGaleria
              foto={foto}
              indice={indice}
              presentacion={presentacion}
              claseImagen={PROPORCION_FOTO_CLASE[proporcion]}
              onAbrir={onAbrirFoto}
            />
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
          <div className="mt-4 flex items-center justify-center gap-2">
            {autoDisponible ? (
              <button
                type="button"
                onClick={() => setPausadoPorUsuario((valor) => !valor)}
                aria-label={pausadoPorUsuario ? 'Reanudar el carrusel' : 'Pausar el carrusel'}
                className="mr-1 grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {pausadoPorUsuario ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </button>
            ) : null}
            {fotos.map((foto, indice) => (
              <button
                key={`dot-${foto.media_id}-${indice}`}
                type="button"
                aria-label={`Ir a la foto ${indice + 1}`}
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
