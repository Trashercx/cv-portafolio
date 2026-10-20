import type { ReactNode } from 'react'
import { ExternalLink, FolderGit2, Star } from 'lucide-react'
import { useAbrirDetalle } from '@/components/publico/contexto-detalle'
import type { Proyecto } from '@/features/proyectos/types'
import type { ProyectosConfiguracion } from '@/features/secciones/types'
import { resolverEnlaceSeguro } from '@/lib/enlaces'
import { CLASES_BORDE_BLOQUE, PORTADA_PROYECTO_CLASE } from '@/lib/escalas-bloque'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { Chip, type VarianteChip } from '../Chip'
import { EnlaceBloque } from '../contexto-renderizado'
import { IconoGithub } from '../IconoGithub'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaContenido } from '../TarjetaContenido'
import { TituloBloque } from './TituloBloque'

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

/**
 * Fase 7 (7.3, UC-12), Fase 7l (UC-02): clases del contenedor por
 * `disposicion`. `tarjetas` usa `COLUMNAS_CLASE`; `bento` es una cuadrícula de
 * 6 columnas en `md`; `lista` apila filas; `vitrina` apila filas grandes cuya
 * imagen alterna de lado.
 */
const CONTENEDOR_DISPOSICION_CLASE: Record<Exclude<Disposicion, 'tarjetas'>, string> = {
  bento: 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6',
  lista: 'grid gap-3',
  vitrina: 'grid gap-6 md:gap-8',
}

/** Bento: el primer proyecto ocupa 4 columnas y 2 filas, el resto 2 columnas (en `md`). */
const BENTO_ITEM_CLASE = {
  destacado: 'sm:col-span-2 md:col-span-4 md:row-span-2',
  normal: 'md:col-span-2',
} as const

/** Fase 7l (UC-02): chip de estado del proyecto. Un estado desconocido no pinta chip. */
const ESTADO_PROYECTO: Record<string, { etiqueta: string; variante: VarianteChip }> = {
  en_progreso: { etiqueta: 'En curso', variante: 'primario' },
  finalizado: { etiqueta: 'Finalizado', variante: 'exito' },
  pausado: { etiqueta: 'Pausado', variante: 'aviso' },
}

/** Máximo de chips de tecnologías por proyecto antes de resumir en `+N`. */
const MAX_TECNOLOGIAS = 5

/** `true` si el repositorio del proyecto vive en GitHub (por origen o por la URL). */
function esRepositorioGithub(proyecto: Proyecto): boolean {
  if (proyecto.origen === 'github') return true
  try {
    return new URL(proyecto.url_repositorio ?? '').hostname.toLowerCase() === 'github.com'
  } catch {
    return false
  }
}

/** Año de una fecha `YYYY-MM-DD` (UTC, como `formatearFecha`). */
function anio(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  const valor = new Date(fecha)
  return Number.isNaN(valor.getTime()) ? null : String(valor.getUTCFullYear())
}

/** "2024 – 2025", "2024 – Actual" o solo "2024" si empieza y termina el mismo año. */
function rangoFechas(proyecto: Proyecto): string | null {
  const inicio = anio(proyecto.fecha_inicio)
  if (!inicio) return null
  const fin = anio(proyecto.fecha_fin)
  if (!proyecto.fecha_fin) return `${inicio} – Actual`
  return fin && fin !== inicio ? `${inicio} – ${fin}` : inicio
}

const CLASE_ACCION = cn(
  'inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent',
  'focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:outline-none',
  CLASES_BORDE_BLOQUE,
)

/** Enlaces http(s) válidos de un proyecto (`javascript:` y similares se descartan). */
function enlacesDe(proyecto: Proyecto) {
  const demo = resolverEnlaceSeguro(proyecto.url_demo ?? undefined)
  const codigo = resolverEnlaceSeguro(proyecto.url_repositorio ?? undefined)
  return {
    demo: demo && 'href' in demo ? demo : null,
    codigo: codigo && 'href' in codigo ? codigo : null,
  }
}

/** Acciones "Demo" y "Código" (enlaces seguros; inertes en el lienzo vía `EnlaceBloque`). */
function Acciones({ proyecto }: { proyecto: Proyecto }) {
  const { demo, codigo } = enlacesDe(proyecto)
  return (
    <>
      {demo ? (
        <EnlaceBloque {...demo} aria-label={`Demo de ${proyecto.titulo}`} className={CLASE_ACCION}>
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Demo
        </EnlaceBloque>
      ) : null}
      {codigo ? (
        <EnlaceBloque {...codigo} aria-label={`Código de ${proyecto.titulo}`} className={CLASE_ACCION}>
          {esRepositorioGithub(proyecto) ? (
            <IconoGithub className="size-3.5" />
          ) : (
            <ExternalLink className="size-3.5" aria-hidden="true" />
          )}
          Código
        </EnlaceBloque>
      ) : null}
    </>
  )
}

function ChipsTecnologias({ proyecto }: { proyecto: Proyecto }) {
  const nombres = (proyecto.tecnologias ?? []).map((enlace) => enlace.tecnologia.nombre)
  if (nombres.length === 0) return null
  const visibles = nombres.slice(0, MAX_TECNOLOGIAS)
  const restantes = nombres.length - visibles.length
  return (
    <ul data-tecnologias="true" className="flex flex-wrap gap-1.5" aria-label="Tecnologías">
      {visibles.map((nombre) => (
        <Chip key={nombre} comoItem>
          {nombre}
        </Chip>
      ))}
      {restantes > 0 ? (
        <Chip comoItem>+{restantes}</Chip>
      ) : null}
    </ul>
  )
}

/** Portada 16:9 con degradado inferior y, si no hay imagen, un fondo con los colores del tema. */
function Portada({ proyecto, chipEstado }: { proyecto: Proyecto; chipEstado: ReactNode }) {
  const imagen = proyecto.imagenes[0]
  return (
    <>
      {imagen ? (
        <ImagenResponsive
          media={imagen.media}
          alt={imagen.media.alt_text ?? proyecto.titulo}
          sizes={SIZES_POR_CONTEXTO.proyecto_tarjeta}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          data-portada="vacia"
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-linear-to-br from-[var(--color-primario)]/20 to-[var(--color-secundario)]/20 text-muted-foreground"
        >
          <FolderGit2 className="size-10 opacity-60" />
        </div>
      )}
      <div
        aria-hidden="true"
        data-degradado
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-[color-mix(in_oklab,var(--foreground)_45%,transparent)] to-transparent"
      />
      {chipEstado ? <div className="absolute top-2 left-2">{chipEstado}</div> : null}
    </>
  )
}

/** Bloque `proyectos`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4, Fase 7 y Fase 7l). */
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
  const mostrarEstado = config.mostrar_estado ?? true
  const mostrarEnlaces = config.mostrar_enlaces ?? true
  const mostrarGithub = config.mostrar_github ?? true
  const mostrarFechas = config.mostrar_fechas ?? false
  const efectoHover = config.efecto_hover ?? 'elevar'
  const abrirDetalle = useAbrirDetalle()

  return (
    <div className="grid gap-6">
      <TituloBloque titulo={titulo} alineacion={alineacionTitulo} mostrar={config.mostrar_titulo} />
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
            const esLista = disposicion === 'lista'
            const esVitrina = disposicion === 'vitrina'
            const esBentoDestacado = disposicion === 'bento' && indice === 0
            const estado = mostrarEstado ? ESTADO_PROYECTO[proyecto.estado] : undefined
            const chipEstado = estado ? (
              <Chip variante={estado.variante} className="shadow-sm backdrop-blur-sm">
                {estado.etiqueta}
              </Chip>
            ) : null

            // Línea meta: lenguaje y estrellas (GitHub) y fechas.
            const lenguaje = mostrarGithub ? proyecto.github_lenguaje : null
            const estrellas = mostrarGithub ? proyecto.github_estrellas : null
            const fechas = mostrarFechas ? rangoFechas(proyecto) : null
            const meta =
              lenguaje || estrellas != null || fechas ? (
                <p data-meta-proyecto className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {lenguaje ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-[var(--color-primario)]"
                      />
                      {lenguaje}
                    </span>
                  ) : null}
                  {estrellas != null ? (
                    <span
                      className="inline-flex items-center gap-1"
                      aria-label={`${estrellas} estrellas en GitHub`}
                    >
                      <Star className="size-3.5" aria-hidden="true" />
                      {estrellas}
                    </span>
                  ) : null}
                  {fechas ? <span>{fechas}</span> : null}
                </p>
              ) : null

            const claseMedio = esLista
              ? PORTADA_PROYECTO_CLASE.lista
              : esVitrina
                ? PORTADA_PROYECTO_CLASE.vitrina
                : esBentoDestacado
                  ? PORTADA_PROYECTO_CLASE.bento_destacado
                  : PORTADA_PROYECTO_CLASE.tarjetas

            return (
              <ItemAnimado
                key={proyecto.id}
                indice={indice}
                className={cn(
                  disposicion === 'bento' &&
                    BENTO_ITEM_CLASE[esBentoDestacado ? 'destacado' : 'normal'],
                )}
              >
                <TarjetaContenido
                  titulo={proyecto.titulo}
                  posicionMedio={esLista ? 'izquierda' : esVitrina ? (indice % 2 === 0 ? 'fila_md' : 'fila_md_inversa') : 'arriba'}
                  claseMedio={claseMedio}
                  claseCuerpo={esVitrina ? 'md:justify-center md:gap-3 md:p-8' : undefined}
                  medio={<Portada proyecto={proyecto} chipEstado={esLista ? null : chipEstado} />}
                  meta={meta}
                  descripcion={
                    mostrarDescripcion ? (
                      <p
                        className={cn(
                          'text-sm text-muted-foreground',
                          esVitrina ? 'line-clamp-4' : 'line-clamp-2',
                        )}
                      >
                        {proyecto.descripcion}
                      </p>
                    ) : null
                  }
                  chips={
                    <>
                      {esLista ? chipEstado : null}
                      {mostrarTecnologias ? <ChipsTecnologias proyecto={proyecto} /> : null}
                    </>
                  }
                  acciones={
                    mostrarEnlaces && (enlacesDe(proyecto).demo || enlacesDe(proyecto).codigo) ? (
                      <Acciones proyecto={proyecto} />
                    ) : null
                  }
                  estiloTarjeta={config.estilo_tarjeta ?? 'simple'}
                  efectoHover={efectoHover}
                  onAbrir={() => abrirDetalle('proyecto', proyecto)}
                />
              </ItemAnimado>
            )
          })}
        </div>
      )}
    </div>
  )
}
