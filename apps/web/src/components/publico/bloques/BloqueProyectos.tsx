import { useAbrirDetalle } from '@/components/publico/contexto-detalle'
import type { Proyecto } from '@/features/proyectos/types'
import type { ProyectosConfiguracion } from '@/features/secciones/types'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { ImagenResponsive } from '../ImagenResponsive'
import { TarjetaClicable } from '../contexto-renderizado'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaInteractiva } from '../TarjetaInteractiva'
import { CLASES_BORDE_BLOQUE, CLASES_BORDE_VIDRIO_BLOQUE } from '@/lib/escalas-bloque'

type BloqueProyectosProps = {
  titulo: string
  config: ProyectosConfiguracion
  proyectos: Proyecto[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

type Disposicion = NonNullable<ProyectosConfiguracion['disposicion']>

/** Clase de columnas del grid según `config.columnas` (Fase 3.4). */
const COLUMNAS_CLASE: Record<NonNullable<ProyectosConfiguracion['columnas']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
}

/** Clase de la tarjeta según `config.estilo_tarjeta` (Fase 3.4; `vidrio` en Fase 7). */
const ESTILO_TARJETA_CLASE: Record<
  NonNullable<ProyectosConfiguracion['estilo_tarjeta']>,
  string
> = {
  // Fase 7c (UC-12): el contorno sale de `CLASES_BORDE_BLOQUE` (opcional por bloque).
  simple: CLASES_BORDE_BLOQUE,
  con_sombra: `${CLASES_BORDE_BLOQUE} shadow-md`,
  vidrio: `${CLASES_BORDE_VIDRIO_BLOQUE} bg-card/60 backdrop-blur-sm`,
}

/**
 * Fase 7 (7.3, UC-12): clases del contenedor por `disposicion`. `tarjetas`
 * usa `COLUMNAS_CLASE`; `bento` es una cuadrícula de 6 columnas en `md`; `lista`
 * apila filas.
 */
const CONTENEDOR_DISPOSICION_CLASE: Record<Exclude<Disposicion, 'tarjetas'>, string> = {
  bento: 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6',
  lista: 'grid gap-3',
}

/** Bento: el primer proyecto ocupa 4 columnas y 2 filas, el resto 2 columnas (en `md`). */
const BENTO_ITEM_CLASE = {
  destacado: 'sm:col-span-2 md:col-span-4 md:row-span-2',
  normal: 'md:col-span-2',
} as const

/** Máximo de chips de tecnologías por proyecto antes de resumir en `+N`. */
const MAX_TECNOLOGIAS = 5

function ChipsTecnologias({ proyecto }: { proyecto: Proyecto }) {
  const nombres = (proyecto.tecnologias ?? []).map((enlace) => enlace.tecnologia.nombre)
  if (nombres.length === 0) return null
  const visibles = nombres.slice(0, MAX_TECNOLOGIAS)
  const restantes = nombres.length - visibles.length
  return (
    <ul data-tecnologias="true" className="flex flex-wrap gap-1.5" aria-label="Tecnologías">
      {visibles.map((nombre) => (
        <li key={nombre} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {nombre}
        </li>
      ))}
      {restantes > 0 ? (
        <li className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{restantes}
        </li>
      ) : null}
    </ul>
  )
}

/** Bloque `proyectos`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4 y Fase 7). */
export function BloqueProyectos({
  titulo,
  config,
  proyectos,
  alineacionTitulo,
}: BloqueProyectosProps) {
  const ordenados = [...proyectos]
    .filter((proyecto) => !config.solo_destacados || proyecto.destacado)
    .sort((a, b) => a.orden - b.orden)
    .slice(0, config.cantidad_a_mostrar)

  const disposicion: Disposicion = config.disposicion ?? 'tarjetas'
  // Bento: el primer destacado (o, sin destacados, el primero) pasa al frente
  // para ocupar la celda grande.
  const indiceDestacado = ordenados.findIndex((proyecto) => proyecto.destacado)
  const filtrados =
    disposicion === 'bento' && indiceDestacado > 0
      ? [
          ordenados[indiceDestacado],
          ...ordenados.filter((_, indice) => indice !== indiceDestacado),
        ]
      : ordenados

  const mostrarDescripcion = config.mostrar_descripcion ?? true
  const mostrarTecnologias = config.mostrar_tecnologias ?? true
  const efectoHover = config.efecto_hover ?? 'elevar'
  const abrirDetalle = useAbrirDetalle()

  return (
    <div className="grid gap-6">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay proyectos.</p>
      ) : (
        <div
          data-disposicion={disposicion}
          className={cn(
            disposicion === 'tarjetas'
              ? cn('grid gap-4', COLUMNAS_CLASE[config.columnas ?? 3])
              : CONTENEDOR_DISPOSICION_CLASE[disposicion],
          )}
        >
          {filtrados.map((proyecto, indice) => {
            const imagen = proyecto.imagenes[0]
            const esLista = disposicion === 'lista'
            const esBentoDestacado = disposicion === 'bento' && indice === 0

            return (
              <ItemAnimado
                key={proyecto.id}
                indice={indice}
                className={cn(
                  disposicion === 'bento' &&
                    BENTO_ITEM_CLASE[esBentoDestacado ? 'destacado' : 'normal'],
                )}
              >
                <TarjetaInteractiva efecto={efectoHover} className="h-full">
                  <TarjetaClicable
                    onClick={() => abrirDetalle('proyecto', proyecto)}
                    aria-label={proyecto.titulo}
                    className={cn(
                      'h-full w-full rounded-lg p-4 text-left transition-colors hover:bg-accent',
                      esLista ? 'flex items-start gap-4' : 'flex flex-col gap-2',
                      ESTILO_TARJETA_CLASE[config.estilo_tarjeta ?? 'simple'],
                    )}
                  >
                    {imagen ? (
                      <ImagenResponsive
                        media={imagen.media}
                        alt={imagen.media.alt_text ?? proyecto.titulo}
                        sizes={SIZES_POR_CONTEXTO.proyecto_tarjeta}
                        className={cn(
                          'rounded-md object-cover',
                          esLista
                            ? 'aspect-video w-24 shrink-0 sm:w-40'
                            : esBentoDestacado
                              ? 'aspect-video w-full md:aspect-auto md:min-h-48 md:flex-1'
                              : 'aspect-video w-full',
                        )}
                      />
                    ) : null}
                    <div className={cn('grid min-w-0 gap-2', esLista && 'flex-1')}>
                      <h3 className="font-semibold">{proyecto.titulo}</h3>
                      {mostrarDescripcion ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {proyecto.descripcion}
                        </p>
                      ) : null}
                      {mostrarTecnologias ? <ChipsTecnologias proyecto={proyecto} /> : null}
                    </div>
                  </TarjetaClicable>
                </TarjetaInteractiva>
              </ItemAnimado>
            )
          })}
        </div>
      )}
    </div>
  )
}
