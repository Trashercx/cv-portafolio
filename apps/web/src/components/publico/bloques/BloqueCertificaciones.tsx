import { FileIcon } from 'lucide-react'
import type { CertificacionPublica } from '@/features/publico/types'
import type { CertificacionesConfiguracion } from '@/features/secciones/types'
import { formatearFecha } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { EnlaceBloque } from '../contexto-renderizado'

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
  simple: 'border',
  con_sombra: 'border shadow-md',
}

/** Bloque `certificaciones`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4). */
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

  return (
    <div className="grid gap-6">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {ordenadas.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay certificaciones.
        </p>
      ) : (
        <div className={cn('grid gap-4', COLUMNAS_CLASE[config.columnas ?? 3])}>
          {ordenadas.map((certificacion) => (
            <EnlaceBloque
              key={certificacion.id}
              to={`/certificacion/${certificacion.id}`}
              className={cn(
                'grid gap-2 rounded-lg p-4 transition-colors hover:bg-accent',
                ESTILO_TARJETA_CLASE[config.estilo_tarjeta ?? 'simple'],
              )}
            >
              {certificacion.logo ? (
                // Tarjeta clicable (navega al detalle, UC-13): el zoom/lightbox
                // del logo o documento vive en `CertificacionDetallePage`, no
                // acá — anidar el `Dialog` de `MediaPreview` dentro de este
                // enlace interceptaría el click de navegación. Si el logo es
                // un PDF (feedback externo, UC-04) se muestra un ícono en vez
                // de un `<img>` roto.
                certificacion.logo.tipo === 'imagen' ? (
                  <img
                    src={certificacion.logo.url}
                    alt={certificacion.logo.alt_text ?? certificacion.nombre}
                    className="size-12 object-contain"
                  />
                ) : (
                  <FileIcon
                    className="size-12 text-muted-foreground"
                    aria-label="Documento del certificado"
                  />
                )
              ) : null}
              <h3 className="font-semibold">{certificacion.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                {certificacion.institucion}
              </p>
              {mostrarFecha ? (
                <p className="text-xs text-muted-foreground">
                  {formatearFecha(certificacion.fecha_emision)}
                </p>
              ) : null}
            </EnlaceBloque>
          ))}
        </div>
      )}
    </div>
  )
}
