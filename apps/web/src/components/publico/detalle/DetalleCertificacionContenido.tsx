import { MediaPreview } from '@/components/media/MediaPreview'
import type { CertificacionPublica } from '@/features/publico/types'
import { formatearFecha } from '@/lib/formato'

type DetalleCertificacionContenidoProps = {
  certificacion: CertificacionPublica
}

/**
 * Contenido de detalle de una certificación (UC-13), sin loading/error ni
 * navegación propia: extraído de `CertificacionDetallePage` (Fase 4.3) para
 * reusarse tanto en la página standalone (`/certificacion/:id`) como en el
 * modal que abre `ProveedorDetallePublico`. `certificacion.logo` ya viene
 * resuelto en ambos casos — ver `SnapshotSitio.certificaciones` y
 * `useCertificacionPublica`.
 */
export function DetalleCertificacionContenido({
  certificacion,
}: DetalleCertificacionContenidoProps) {
  return (
    <div className="grid gap-6">
      {certificacion.logo ? (
        <MediaPreview
          tipo={certificacion.logo.tipo}
          url={certificacion.logo.url}
          alt={certificacion.logo.alt_text ?? certificacion.nombre}
          nombre={certificacion.nombre}
          className="size-20 rounded-md"
          fit="contain"
        />
      ) : null}

      <div className="grid gap-1">
        <h1 className="text-3xl font-bold">{certificacion.nombre}</h1>
        <p className="text-muted-foreground">{certificacion.institucion}</p>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Emitida</dt>
          <dd>{formatearFecha(certificacion.fecha_emision)}</dd>
        </div>
        {certificacion.fecha_expiracion ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Expira</dt>
            <dd>{formatearFecha(certificacion.fecha_expiracion)}</dd>
          </div>
        ) : null}
        {certificacion.credencial_id ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Credencial</dt>
            <dd>{certificacion.credencial_id}</dd>
          </div>
        ) : null}
      </dl>

      <a
        href={certificacion.url_verificacion}
        target="_blank"
        rel="noreferrer"
        style={{ backgroundColor: 'var(--color-primario)' }}
        className="w-fit rounded-md px-6 py-2.5 text-sm font-medium text-white"
      >
        Verificar credencial
      </a>
    </div>
  )
}
