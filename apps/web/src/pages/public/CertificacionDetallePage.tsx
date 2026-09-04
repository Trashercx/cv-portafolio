import { Link, useParams } from 'react-router-dom'
import { DetalleCertificacionContenido } from '@/components/publico/detalle/DetalleCertificacionContenido'
import { useCertificacionPublica } from '@/features/publico/usePublico'
import { ApiError } from '@/lib/api-client'

/**
 * UC-13 (Ver detalle de una certificación): `GET /certificaciones/:id`
 * contra el snapshot publicado. 404 amigable si no existe ahí (o id mal
 * formado, tratado igual que un 404 aquí).
 *
 * El contenido de detalle en sí vive en `DetalleCertificacionContenido`
 * (Fase 4.3): se comparte con el modal que abre `ProveedorDetallePublico`
 * al hacer click en una tarjeta desde la home, sin fetch adicional en ese
 * caso. Esta página existe para el acceso directo por URL (link
 * compartible), donde sí hace falta pedir la certificación por id.
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

      <DetalleCertificacionContenido certificacion={certificacion} />
    </div>
  )
}
