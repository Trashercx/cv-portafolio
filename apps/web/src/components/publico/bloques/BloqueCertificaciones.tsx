import { FileIcon } from 'lucide-react'
import type { CertificacionPublica } from '@/features/publico/types'
import type { CertificacionesConfiguracion } from '@/features/secciones/types'
import { formatearFecha } from '@/lib/formato'
import { EnlaceBloque } from '../contexto-renderizado'

type BloqueCertificacionesProps = {
  titulo: string
  config: CertificacionesConfiguracion
  certificaciones: CertificacionPublica[]
}

/** Bloque `certificaciones`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueCertificaciones({
  titulo,
  config,
  certificaciones,
}: BloqueCertificacionesProps) {
  const ordenadas = [...certificaciones].sort((a, b) =>
    config.orden === 'fecha'
      ? new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()
      : a.orden - b.orden,
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {ordenadas.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay certificaciones.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordenadas.map((certificacion) => (
            <EnlaceBloque
              key={certificacion.id}
              to={`/certificacion/${certificacion.id}`}
              className="grid gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
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
              <p className="text-xs text-muted-foreground">
                {formatearFecha(certificacion.fecha_emision)}
              </p>
            </EnlaceBloque>
          ))}
        </div>
      )}
    </div>
  )
}
