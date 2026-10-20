import { lazy, Suspense, useState, type ReactNode } from 'react'
import type { GaleriaConfiguracion, GaleriaFoto } from '@/features/secciones/types'
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
import { CarruselBase } from '../CarruselBase'
import { CintaBase } from '../CintaBase'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaInteractiva } from '../TarjetaInteractiva'
import { TarjetaClicable } from '../contexto-renderizado'
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
 * bucle. Fase 7l: la mecánica (pista doble, pausa, quieta en el lienzo y con
 * movimiento reducido) vive en `CintaBase`, compartida con las insignias.
 */
function CintaGaleria({
  fotos,
  presentacion,
  proporcion,
  separacion,
  segundosPorFoto,
  onAbrir,
}: CintaGaleriaProps) {
  return (
    <CintaBase
      duracionSegundos={Math.max(12, fotos.length * segundosPorFoto)}
      // El relleno derecho de cada vuelta es la misma separación entre fotos.
      claseVuelta={cn(separacion.gap, separacion.relleno)}
      etiquetas={{ pausar: 'Pausar la cinta', reanudar: 'Reanudar la cinta' }}
    >
      {(decorativa) =>
        fotos.map((foto, indice) => (
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
        ))
      }
    </CintaBase>
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
 * `disposicion='carousel'` (default de UC-18): scroll-snap horizontal nativo.
 * Fase 7j: avance automático opcional. Fase 7l: la mecánica vive en
 * `CarruselBase`, compartida con las insignias.
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
  return (
    <CarruselBase
      items={fotos.map((foto, indice) => (
        <FotoGaleria
          key={`${foto.media_id}-${indice}`}
          foto={foto}
          indice={indice}
          presentacion={presentacion}
          claseImagen={PROPORCION_FOTO_CLASE[proporcion]}
          onAbrir={onAbrirFoto}
        />
      ))}
      claseItem="w-full sm:w-2/3 lg:w-1/2"
      gap={gap}
      automatico={automatico}
      intervaloSegundos={intervaloSegundos}
      // `elevar` sube 4 px y proyecta sombra: este contenedor recorta en
      // vertical (`overflow-x-auto`), así que se le da aire arriba y abajo.
      claseDesplazable={
        presentacion.efecto === 'elevar' || presentacion.efecto === 'inclinar' ? '-my-3 py-3' : undefined
      }
      etiquetas={{
        anterior: 'Foto anterior',
        siguiente: 'Foto siguiente',
        pausar: 'Pausar el carrusel',
        reanudar: 'Reanudar el carrusel',
        irA: (n) => `Ir a la foto ${n}`,
      }}
    />
  )
}
