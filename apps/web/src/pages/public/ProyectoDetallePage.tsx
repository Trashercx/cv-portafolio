import { Link, useParams } from 'react-router-dom'
import { DetalleProyectoContenido } from '@/components/publico/detalle/DetalleProyectoContenido'
import { MetadatosPagina } from '@/components/publico/MetadatosPagina'
import { useProyectoPublico, useSitio } from '@/features/publico/usePublico'
import { useFuenteTema } from '@/features/tema/useFuenteTema'
import { ApiError } from '@/lib/api-client'
import { recortarDescripcion } from '@/lib/seo'

/**
 * UC-13 (Ver detalle de un proyecto): `GET /proyectos/:id` contra el
 * snapshot publicado. 404 amigable si el proyecto no existe ahí (borrado,
 * nunca publicado, o id inválido — el backend responde 400 con
 * `ParseUUIDPipe` para un id mal formado, tratado igual que un 404 aquí).
 *
 * El contenido de detalle en sí vive en `DetalleProyectoContenido` (Fase
 * 4.3): se comparte con el modal que abre `ProveedorDetallePublico` al
 * hacer click en una tarjeta desde la home, sin fetch adicional en ese
 * caso. Esta página existe para el acceso directo por URL (link
 * compartible), donde sí hace falta pedir el proyecto por id.
 */
export function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { data: proyecto, isLoading, error } = useProyectoPublico(id)
  // Fase 7 (UC-08): fuente del tema (snapshot ya en caché desde la home).
  const { data: sitio } = useSitio()
  useFuenteTema(sitio?.tema?.fuente_principal)

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Cargando proyecto…</p>
      </div>
    )
  }

  if (error) {
    const noEncontrado =
      error instanceof ApiError && (error.status === 404 || error.status === 400)

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-muted-foreground">
          {noEncontrado
            ? 'Este proyecto no existe o todavía no está publicado.'
            : 'No se pudo cargar el proyecto.'}
        </p>
        <Link to="/" className="text-sm underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    )
  }

  if (!proyecto) return null

  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-6">
      {/* Fase 6 (UC-13): SEO del detalle. */}
      <MetadatosPagina
        titulo={proyecto.titulo}
        descripcion={recortarDescripcion(proyecto.descripcion)}
        imagen={proyecto.imagenes[0]?.media.url}
        tipo="article"
      />
      <Link to="/" className="text-sm underline underline-offset-4">
        ← Volver al inicio
      </Link>

      <DetalleProyectoContenido proyecto={proyecto} />
    </div>
  )
}
