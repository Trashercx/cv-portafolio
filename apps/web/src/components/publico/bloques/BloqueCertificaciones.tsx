import { IconoDocumento } from '@/components/media/IconoDocumento'
import { useAbrirDetalle } from '@/components/publico/contexto-detalle'
import type { CertificacionPublica } from '@/features/publico/types'
import type { CertificacionesConfiguracion } from '@/features/secciones/types'
import { formatearFecha } from '@/lib/formato'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { ImagenResponsive } from '../ImagenResponsive'
import { TarjetaClicable } from '../contexto-renderizado'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaInteractiva } from '../TarjetaInteractiva'
import { CLASES_BORDE_BLOQUE, CLASES_BORDE_VIDRIO_BLOQUE } from '@/lib/escalas-bloque'

type BloqueCertificacionesProps = {
  titulo: string
  config: CertificacionesConfiguracion
  certificaciones: CertificacionPublica[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/** Clase de columnas del grid según `config.columnas` (Fase 3.4). */
const COLUMNAS_CLASE: Record<NonNullable<CertificacionesConfiguracion['columnas']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
}

/** Clase de la tarjeta según `config.estilo_tarjeta` (Fase 3.4). */
const ESTILO_TARJETA_CLASE: Record<
  NonNullable<CertificacionesConfiguracion['estilo_tarjeta']>,
  string
> = {
  // Fase 7c (UC-12): el contorno sale de `CLASES_BORDE_BLOQUE` (opcional por bloque).
  simple: CLASES_BORDE_BLOQUE,
  con_sombra: `${CLASES_BORDE_BLOQUE} shadow-md`,
  vidrio: `${CLASES_BORDE_VIDRIO_BLOQUE} bg-card/60 backdrop-blur-sm`,
}

/** Bloque `certificaciones`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4 y Fase 7). */
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

  const mostrarFecha = config.mostrar_fecha ?? true
  const abrirDetalle = useAbrirDetalle()
  const esVidrio = config.estilo_tarjeta === 'vidrio'

  return (
    <div className="grid gap-6">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {ordenadas.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay certificaciones.
        </p>
      ) : (
        <div className={cn('grid gap-4', COLUMNAS_CLASE[config.columnas ?? 3])}>
          {ordenadas.map((certificacion, indice) => (
            <ItemAnimado key={certificacion.id} indice={indice}>
              <TarjetaInteractiva efecto={config.efecto_hover} className="h-full">
                <TarjetaClicable
                  onClick={() => abrirDetalle('certificacion', certificacion)}
                  aria-label={certificacion.nombre}
                  className={cn(
                    'h-full w-full rounded-lg p-4 text-left transition-colors hover:bg-accent',
                    esVidrio ? 'flex items-center gap-4' : 'grid gap-2',
                    ESTILO_TARJETA_CLASE[config.estilo_tarjeta ?? 'simple'],
                  )}
                >
                  {certificacion.logo ? (
                    // Tarjeta clicable (abre el detalle en un modal, UC-13): el
                    // zoom/lightbox del logo o documento vive dentro del propio
                    // modal (`DetalleCertificacionContenido`), no acá — mostrar
                    // solo un ícono/miniatura estática en la tarjeta evita anidar
                    // el `Dialog` de `MediaPreview` dentro de este botón. Si el
                    // logo es un PDF (feedback externo, UC-04) se muestra un
                    // ícono en vez de un `<img>` roto.
                    certificacion.logo.tipo === 'imagen' ? (
                      <ImagenResponsive
                        media={certificacion.logo}
                        alt={certificacion.logo.alt_text ?? certificacion.nombre}
                        sizes={SIZES_POR_CONTEXTO.certificacion_logo}
                        className={cn(
                          'object-contain',
                          esVidrio ? 'size-12 shrink-0' : 'size-12',
                        )}
                      />
                    ) : (
                      <IconoDocumento
                        className={cn('size-12', esVidrio ? 'shrink-0' : undefined)}
                        iconoClassName="size-6"
                      />
                    )
                  ) : null}
                  <div className={esVidrio ? 'grid gap-1' : 'contents'}>
                    <h3 className="font-semibold">{certificacion.nombre}</h3>
                    <p className="text-sm text-muted-foreground">
                      {certificacion.institucion}
                    </p>
                    {mostrarFecha ? (
                      <p className="text-xs text-muted-foreground">
                        {formatearFecha(certificacion.fecha_emision)}
                      </p>
                    ) : null}
                  </div>
                </TarjetaClicable>
              </TarjetaInteractiva>
            </ItemAnimado>
          ))}
        </div>
      )}
    </div>
  )
}
