import { Link, useParams } from 'react-router-dom'
import { MediaPreview } from '@/components/media/MediaPreview'
import { useCertificacionPublica } from '@/features/publico/usePublico'
import { ApiError } from '@/lib/api-client'
import { formatearFecha } from '@/lib/formato'

/**
 * UC-13 (Ver detalle de una certificación): `GET /certificaciones/:id`
 * contra el snapshot publicado. 404 amigable si no existe ahí (o id mal
 * formado, tratado igual que un 404 aquí).
 */
export function CertificacionDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { data: certificacion, isLoading, error } = useCertificacionPublica(id)

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Cargando certificación…</p>
      </div>
    )
  }

  if (error) {
    const noEncontrada =
      error instanceof ApiError && (error.status === 404 || error.status === 400)

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-muted-foreground">
          {noEncontrada
            ? 'Esta certificación no existe o todavía no está publicada.'
            : 'No se pudo cargar la certificación.'}
        </p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    )
  }

  if (!certificacion) return null

  return (
    <div className="mx-auto grid max-w-2xl gap-6 p-6">
      <Link to="/" className="text-sm underline underline-offset-4">
        ← Volver al inicio
      </Link>

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
