import { Link, useParams } from 'react-router-dom'
import { DetalleLogroContenido } from '@/components/publico/detalle/DetalleLogroContenido'
import { MetadatosPagina } from '@/components/publico/MetadatosPagina'
import { useSitio } from '@/features/publico/usePublico'
import { ApiError } from '@/lib/api-client'
import { recortarDescripcion } from '@/lib/seo'

/**
 * UC-13 (Ver detalle de un logro), acceso directo por URL (`/logro/:id`).
 * A diferencia de proyectos/certificaciones, no existe `GET /logros/:id`
 * (Logros nunca tuvo endpoint por id) — se usa el snapshot completo de
 * `useSitio()` (`GET /sitio`, la última versión publicada) y se busca el
 * logro por id ahí. Mismo criterio de "404 amigable" que
 * `ProyectoDetallePage`/`CertificacionDetallePage`: id inválido o logro
 * ausente de la última versión publicada se tratan igual.
 */
export function LogroDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { data: snapshot, isLoading, error } = useSitio()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Cargando logro…</p>
      </div>
    )
  }

  const logro = snapshot?.logros.find((item) => item.id === id)

  if (error || !logro) {
    const errorInesperado = error && !(error instanceof ApiError && error.status === 404)

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-muted-foreground">
          {errorInesperado
            ? 'No se pudo cargar el logro.'
            : 'Este logro no existe o todavía no está publicado.'}
        </p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-6">
      {/* Fase 6 (UC-13): SEO del detalle. */}
      <MetadatosPagina
        titulo={logro.titulo}
        descripcion={recortarDescripcion(logro.descripcion)}
        tipo="article"
      />
      <Link to="/" className="text-sm underline underline-offset-4">
        ← Volver al inicio
      </Link>

      <DetalleLogroContenido logro={logro} />
    </div>
  )
}
