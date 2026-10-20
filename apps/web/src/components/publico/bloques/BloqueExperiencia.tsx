import type { ReactNode } from 'react'
import { etiquetaModalidad, type ExperienciaPublica } from '@/features/experiencias/types'
import type { ExperienciaConfiguracion } from '@/features/secciones/types'
import { textoDuracion } from '@/lib/duracion'
import { resolverEnlaceSeguro } from '@/lib/enlaces'
import { CLASES_BORDE_BLOQUE, LINEA_BORDE_BLOQUE_CLASE } from '@/lib/escalas-bloque'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { EnlaceBloque, useModoRenderizado } from '../contexto-renderizado'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaInteractiva } from '../TarjetaInteractiva'
import { TituloBloque } from './TituloBloque'

type BloqueExperienciaProps = {
  titulo: string
  config: ExperienciaConfiguracion
  /** `datos.experiencias ?? []`: los snapshots anteriores a la Fase 7l no la traen. */
  experiencias: ExperienciaPublica[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE`, aplicada al encabezado. */
  alineacionTitulo?: string
}

/** Mes abreviado y año ("ene 2020") a partir de `YYYY-MM-DD`; vacío si la fecha no se interpreta. */
function mesAnio(fecha: string): string {
  const valor = new Date(fecha)
  if (Number.isNaN(valor.getTime())) return ''
  return valor.toLocaleDateString('es-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function periodo(experiencia: ExperienciaPublica): string {
  const inicio = mesAnio(experiencia.fecha_inicio)
  // El puesto actual ya lo marca la duración ("Actual · …"): aquí solo el inicio.
  const fin = experiencia.fecha_fin ? mesAnio(experiencia.fecha_fin) : ''
  return [inicio, fin].filter(Boolean).join(' – ')
}

/**
 * Orden del sitio y del lienzo: los puestos actuales primero y luego por
 * inicio descendente (mismo criterio que el snapshot del API), así el lienzo
 * —que lee `admin/experiencias` por `orden`— se ve igual que lo publicado.
 */
function ordenarPuestos(experiencias: ExperienciaPublica[]): ExperienciaPublica[] {
  return [...experiencias].sort((a, b) => {
    if ((a.fecha_fin === null) !== (b.fecha_fin === null)) return a.fecha_fin === null ? -1 : 1
    return b.fecha_inicio.localeCompare(a.fecha_inicio)
  })
}

/** Chip mínimo de tecnología, local al bloque (Fase 7l). Sin borde propio: usa el del bloque. */
function ChipExperiencia({ children }: { children: ReactNode }) {
  return (
    <li
      className={cn(
        'rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground',
        CLASES_BORDE_BLOQUE,
      )}
    >
      {children}
    </li>
  )
}

function Logo({ experiencia }: { experiencia: ExperienciaPublica }) {
  if (!experiencia.logo) return null
  return (
    <div
      className={cn(
        'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted',
        CLASES_BORDE_BLOQUE,
      )}
    >
      <ImagenResponsive
        media={experiencia.logo}
        alt={experiencia.logo.alt_text || `Logo de ${experiencia.empresa}`}
        sizes={SIZES_POR_CONTEXTO.certificacion_logo}
        className="size-full object-contain"
      />
    </div>
  )
}

function Empresa({ experiencia }: { experiencia: ExperienciaPublica }) {
  const enlace = resolverEnlaceSeguro(experiencia.url_empresa ?? undefined)
  if (enlace && 'href' in enlace) {
    return (
      <EnlaceBloque
        href={enlace.href}
        target="_blank"
        rel="noreferrer"
        className="underline-offset-4 hover:underline"
      >
        {experiencia.empresa}
      </EnlaceBloque>
    )
  }
  return <span>{experiencia.empresa}</span>
}

/** Línea meta: modalidad, ubicación, periodo y duración, según los `mostrar_*`. */
function LineaMeta({
  experiencia,
  config,
  conPeriodo = true,
}: {
  experiencia: ExperienciaPublica
  config: ExperienciaConfiguracion
  conPeriodo?: boolean
}) {
  const duracion =
    config.mostrar_duracion === false
      ? null
      : textoDuracion(experiencia.fecha_inicio, experiencia.fecha_fin)
  const partes = [
    experiencia.modalidad ? etiquetaModalidad(experiencia.modalidad) : null,
    config.mostrar_ubicacion === false ? null : experiencia.ubicacion,
    conPeriodo ? periodo(experiencia) : null,
    duracion,
  ].filter((parte): parte is string => Boolean(parte))
  if (partes.length === 0) return null
  return <p className="text-xs text-muted-foreground">{partes.join(' · ')}</p>
}

function Tecnologias({
  experiencia,
  config,
}: {
  experiencia: ExperienciaPublica
  config: ExperienciaConfiguracion
}) {
  if (config.mostrar_tecnologias === false || experiencia.tecnologias.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tecnologías">
      {experiencia.tecnologias.map((tecnologia) => (
        <ChipExperiencia key={tecnologia.id}>{tecnologia.nombre}</ChipExperiencia>
      ))}
    </ul>
  )
}

/** Contenido común de un puesto (cargo, empresa, meta, descripción, chips) sin contenedor. */
function CuerpoPuesto({
  experiencia,
  config,
}: {
  experiencia: ExperienciaPublica
  config: ExperienciaConfiguracion
}) {
  const conLogo = config.mostrar_logos !== false && Boolean(experiencia.logo)
  return (
    <div className="flex gap-3">
      {conLogo ? <Logo experiencia={experiencia} /> : null}
      <div className="grid min-w-0 flex-1 gap-1.5">
        <h3 className="font-semibold">{experiencia.cargo}</h3>
        <p className="text-sm">
          <Empresa experiencia={experiencia} />
        </p>
        <LineaMeta experiencia={experiencia} config={config} />
        {experiencia.descripcion ? (
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {experiencia.descripcion}
          </p>
        ) : null}
        <Tecnologias experiencia={experiencia} config={config} />
      </div>
    </div>
  )
}

/**
 * Bloque `experiencia` (Fase 7l, UC-19), compartido entre el sitio público y
 * el lienzo de Puck. Tres disposiciones: `linea_tiempo` (eje vertical con un
 * punto por puesto y el año a la izquierda desde `md`), `tarjetas` y
 * `compacta` (una línea por puesto). Tolera claves de configuración ausentes
 * (cada `mostrar_*` ausente = visible) y la ausencia de `experiencias` (los
 * snapshots anteriores no la traen): sin puestos, el sitio no pinta nada y el
 * lienzo muestra "Sin experiencias".
 */
export function BloqueExperiencia({
  titulo,
  config,
  experiencias,
  alineacionTitulo,
}: BloqueExperienciaProps) {
  const modo = useModoRenderizado()
  const disposicion = config.disposicion ?? 'linea_tiempo'
  const ordenadas = ordenarPuestos(experiencias)
  const mostradas = config.limite ? ordenadas.slice(0, config.limite) : ordenadas
  const encabezado = config.titulo || titulo

  if (mostradas.length === 0 && modo !== 'editor') return null

  return (
    <div className="grid gap-8">
      <div className={cn('grid gap-1', alineacionTitulo)}>
        <TituloBloque titulo={encabezado} mostrar={config.mostrar_titulo} />
        {config.subtitulo ? <p className="text-muted-foreground">{config.subtitulo}</p> : null}
      </div>

      {mostradas.length === 0 ? (
        <p className="text-muted-foreground">Sin experiencias</p>
      ) : disposicion === 'tarjetas' ? (
        <ul data-disposicion-experiencia="tarjetas" className="grid gap-4 sm:grid-cols-2">
          {mostradas.map((experiencia, indice) => (
            <li key={experiencia.id}>
              <ItemAnimado indice={indice} className="h-full">
                <TarjetaInteractiva
                  efecto={config.efecto_hover}
                  className={cn('h-full rounded-lg bg-card p-4', CLASES_BORDE_BLOQUE)}
                >
                  <CuerpoPuesto experiencia={experiencia} config={config} />
                </TarjetaInteractiva>
              </ItemAnimado>
            </li>
          ))}
        </ul>
      ) : disposicion === 'compacta' ? (
        <ul data-disposicion-experiencia="compacta" className="grid gap-2">
          {mostradas.map((experiencia, indice) => (
            <li key={experiencia.id}>
              <ItemAnimado indice={indice}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <p className="min-w-0">
                    <span className="font-semibold">{experiencia.cargo}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-sm">
                      <Empresa experiencia={experiencia} />
                    </span>
                  </p>
                  <LineaMeta experiencia={experiencia} config={config} />
                </div>
              </ItemAnimado>
            </li>
          ))}
        </ul>
      ) : (
        <ul data-disposicion-experiencia="linea_tiempo" className="relative grid gap-8">
          {/* Eje vertical: sigue el contorno del bloque (`ninguno` lo quita). */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-y-1 left-[0.375rem] md:left-[7.75rem]',
              LINEA_BORDE_BLOQUE_CLASE,
            )}
          />
          {mostradas.map((experiencia, indice) => (
            <li
              key={experiencia.id}
              className="relative pl-7 md:grid md:grid-cols-[6.5rem_1fr] md:gap-x-10 md:pl-0"
            >
              <span
                className="absolute top-1.5 left-0 size-3 rounded-full ring-4 ring-background md:left-[7.375rem]"
                style={{ backgroundColor: 'var(--color-primario)' }}
                aria-hidden="true"
              />
              <span
                className="hidden pt-0.5 text-right text-sm font-medium text-muted-foreground md:block"
                aria-hidden="true"
              >
                {experiencia.fecha_inicio.slice(0, 4)}
              </span>
              <ItemAnimado indice={indice}>
                <CuerpoPuesto experiencia={experiencia} config={config} />
              </ItemAnimado>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
