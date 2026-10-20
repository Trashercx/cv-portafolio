import { ExternalLink } from 'lucide-react'
import { MiniaturaPdf } from '@/components/media/MiniaturaPdf'
import { useAbrirDetalle } from '@/components/publico/contexto-detalle'
import type { CertificacionPublica } from '@/features/publico/types'
import type { CertificacionesConfiguracion } from '@/features/secciones/types'
import { resolverEnlaceSeguro } from '@/lib/enlaces'
import { CLASES_BORDE_BLOQUE, LINEA_BORDE_BLOQUE_CLASE } from '@/lib/escalas-bloque'
import { formatearFecha } from '@/lib/formato'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { Chip } from '../Chip'
import { EnlaceBloque, TarjetaClicable } from '../contexto-renderizado'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaContenido } from '../TarjetaContenido'
import { TarjetaInteractiva } from '../TarjetaInteractiva'
import { TituloBloque } from './TituloBloque'

type BloqueCertificacionesProps = {
  titulo: string
  config: CertificacionesConfiguracion
  certificaciones: CertificacionPublica[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

type Disposicion = NonNullable<CertificacionesConfiguracion['disposicion']>

/** Clase de columnas del grid según `config.columnas` (Fase 3.4). */
const COLUMNAS_CLASE: Record<NonNullable<CertificacionesConfiguracion['columnas']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
}

/**
 * Fase 7l (UC-04): estado de vigencia de una certificación. Sin fecha de
 * expiración (Fase 7e) es "Sin vencimiento"; con fecha, "Vigente" si es
 * futura y "Vencida" si ya pasó.
 */
function vigenciaDe(certificacion: CertificacionPublica) {
  if (!certificacion.fecha_expiracion) {
    return { etiqueta: 'Sin vencimiento', variante: 'neutro' } as const
  }
  const expira = new Date(certificacion.fecha_expiracion).getTime()
  if (Number.isNaN(expira) || expira > Date.now()) {
    return { etiqueta: 'Vigente', variante: 'exito' } as const
  }
  return { etiqueta: 'Vencida', variante: 'aviso' } as const
}

/** Año de emisión (UTC, como `formatearFecha`); `'—'` si la fecha no es válida. */
function anioEmision(certificacion: CertificacionPublica): string {
  const valor = new Date(certificacion.fecha_emision)
  return Number.isNaN(valor.getTime()) ? '—' : String(valor.getUTCFullYear())
}

/** Logo (imagen o miniatura de la primera página si es un PDF) o `null` sin logo. */
function ContenidoLogo({
  certificacion,
  className,
}: {
  certificacion: CertificacionPublica
  className?: string
}) {
  const logo = certificacion.logo
  if (!logo) return null
  // Tarjeta clicable (abre el detalle en un modal, UC-13): el zoom/lightbox del
  // logo o documento vive dentro del propio modal (`DetalleCertificacionContenido`),
  // no acá. Si el logo es un PDF (UC-04) se muestra la miniatura de su primera
  // página (Fase 7m, #66; con el icono de documento de respaldo) en vez de un `<img>` roto.
  return logo.tipo === 'imagen' ? (
    <ImagenResponsive
      media={logo}
      alt={logo.alt_text ?? certificacion.nombre}
      sizes={SIZES_POR_CONTEXTO.certificacion_logo}
      className={cn('size-full object-contain', className)}
    />
  ) : (
    <MiniaturaPdf
      url={logo.url}
      alt={logo.alt_text ?? certificacion.nombre}
      ladoMaximo={240}
      claseIcono="size-10"
    />
  )
}

/** Logo en marco cuadrado (Fase 7l): el color de fondo sale del tema. */
function MarcoLogo({ certificacion }: { certificacion: CertificacionPublica }) {
  if (!certificacion.logo) return null
  return (
    <div
      data-marco-logo
      className={cn(
        'grid size-14 place-items-center overflow-hidden rounded-lg bg-muted p-1.5',
        CLASES_BORDE_BLOQUE,
      )}
    >
      <ContenidoLogo certificacion={certificacion} />
    </div>
  )
}

/** Bloque `certificaciones`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4, Fase 7 y Fase 7l). */
export function BloqueCertificaciones({
  titulo,
  config,
  certificaciones,
  alineacionTitulo,
}: BloqueCertificacionesProps) {
  const ordenadas = [...certificaciones].sort((a, b) =>
    config.orden === 'fecha'
      ? new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()
      : a.orden - b.orden,
  )

  const disposicion: Disposicion = config.disposicion ?? 'tarjetas'
  const mostrarFecha = config.mostrar_fecha ?? true
  const mostrarEmisor = config.mostrar_emisor ?? true
  const mostrarVigencia = config.mostrar_vigencia ?? true
  const mostrarEnlace = config.mostrar_enlace ?? true
  const abrirDetalle = useAbrirDetalle()

  /** Tarjeta de una certificación (disposiciones `tarjetas` y `linea_tiempo`). */
  function tarjeta(certificacion: CertificacionPublica) {
    const vigencia = mostrarVigencia ? vigenciaDe(certificacion) : null
    const emision = mostrarFecha ? formatearFecha(certificacion.fecha_emision) : null
    const expira = mostrarFecha ? formatearFecha(certificacion.fecha_expiracion) : null
    const enlace = mostrarEnlace ? resolverEnlaceSeguro(certificacion.url_verificacion ?? undefined) : null
    const href = enlace && 'href' in enlace && /^https?:\/\//i.test(enlace.href) ? enlace : null

    const meta =
      (mostrarEmisor && certificacion.institucion) || emision ? (
        <div className="grid gap-0.5">
          {mostrarEmisor ? (
            <p className="text-sm text-muted-foreground">{certificacion.institucion}</p>
          ) : null}
          {emision ? (
            <p>
              Emitida {emision}
              {expira ? ` · Expira ${expira}` : null}
            </p>
          ) : null}
        </div>
      ) : null

    return (
      <TarjetaContenido
        titulo={certificacion.nombre}
        posicionMedio="izquierda"
        claseMedio="pt-4 pl-4"
        medio={certificacion.logo ? <MarcoLogo certificacion={certificacion} /> : undefined}
        meta={meta}
        chips={
          vigencia ? (
            <div className="flex flex-wrap gap-1.5">
              <Chip variante={vigencia.variante}>{vigencia.etiqueta}</Chip>
            </div>
          ) : null
        }
        acciones={
          href ? (
            <EnlaceBloque
              {...href}
              aria-label={`Ver credencial de ${certificacion.nombre}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent',
                'focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:outline-none',
                CLASES_BORDE_BLOQUE,
              )}
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Ver credencial
            </EnlaceBloque>
          ) : null
        }
        estiloTarjeta={config.estilo_tarjeta ?? 'simple'}
        efectoHover={config.efecto_hover}
        onAbrir={() => abrirDetalle('certificacion', certificacion)}
      />
    )
  }

  let contenido
  if (ordenadas.length === 0) {
    contenido = <p className="text-muted-foreground">Todavía no hay certificaciones.</p>
  } else if (disposicion === 'logos') {
    // Muro de logos cuadrados: el nombre aparece al pasar el cursor o al
    // enfocar, y siempre en punteros sin hover (táctil), como las medallas.
    contenido = (
      <ul
        data-disposicion="logos"
        className="flex flex-wrap justify-center gap-x-5 gap-y-10 pb-6"
      >
        {ordenadas.map((certificacion, indice) => (
          <li key={certificacion.id}>
            <ItemAnimado indice={indice}>
              <TarjetaInteractiva efecto={config.efecto_hover} className="rounded-xl">
                <div className="group/logo relative">
                  <TarjetaClicable
                    onClick={() => abrirDetalle('certificacion', certificacion)}
                    aria-label={certificacion.nombre}
                    className={cn(
                      'grid size-24 place-items-center overflow-hidden rounded-xl bg-card p-3 outline-none sm:size-28',
                      'focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
                      CLASES_BORDE_BLOQUE,
                    )}
                  >
                    {certificacion.logo ? (
                      <ContenidoLogo certificacion={certificacion} />
                    ) : (
                      <span aria-hidden="true" className="text-2xl font-semibold text-muted-foreground">
                        {certificacion.nombre.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </TarjetaClicable>
                  <span
                    aria-hidden="true"
                    data-etiqueta-logo
                    className={cn(
                      'pointer-events-none absolute left-1/2 top-full z-10 mt-2 line-clamp-2 w-max max-w-40 -translate-x-1/2 translate-y-1 rounded-full bg-[var(--foreground)] px-3 py-1 text-center text-xs text-[var(--background)] opacity-0 shadow-lg transition duration-200',
                      'group-hover/logo:translate-y-0 group-hover/logo:opacity-100 group-focus-within/logo:translate-y-0 group-focus-within/logo:opacity-100',
                      '[@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100',
                    )}
                  >
                    {certificacion.nombre}
                  </span>
                </div>
              </TarjetaInteractiva>
            </ItemAnimado>
          </li>
        ))}
      </ul>
    )
  } else if (disposicion === 'linea_tiempo') {
    // Agrupadas por año de emisión, conservando el orden elegido.
    const grupos: Array<{ anio: string; items: CertificacionPublica[] }> = []
    for (const certificacion of ordenadas) {
      const anio = anioEmision(certificacion)
      const grupo = grupos.find((g) => g.anio === anio)
      if (grupo) grupo.items.push(certificacion)
      else grupos.push({ anio, items: [certificacion] })
    }
    contenido = (
      <ol data-disposicion="linea_tiempo" className={cn('grid gap-8 pl-6', LINEA_BORDE_BLOQUE_CLASE)}>
        {grupos.map((grupo) => (
          <li key={grupo.anio} className="relative grid gap-3">
            <span
              aria-hidden="true"
              className="absolute top-2 -left-[calc(1.5rem+6px)] size-3.5 rounded-full bg-[var(--color-primario)] ring-4 ring-background"
            />
            <p data-anio className="text-lg font-semibold text-[var(--color-primario)]">
              {grupo.anio}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {grupo.items.map((certificacion, indice) => (
                <li key={certificacion.id}>
                  <ItemAnimado indice={indice}>{tarjeta(certificacion)}</ItemAnimado>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    )
  } else {
    contenido = (
      <div data-disposicion="tarjetas" className={cn('grid gap-4', COLUMNAS_CLASE[config.columnas ?? 3])}>
        {ordenadas.map((certificacion, indice) => (
          <ItemAnimado key={certificacion.id} indice={indice}>
            {tarjeta(certificacion)}
          </ItemAnimado>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <TituloBloque titulo={titulo} alineacion={alineacionTitulo} mostrar={config.mostrar_titulo} />
      {contenido}
    </div>
  )
}
