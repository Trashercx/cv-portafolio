import { Link, useParams } from 'react-router-dom'
import { useProyectoPublico } from '@/features/publico/usePublico'
import { ApiError } from '@/lib/api-client'
import { formatearFecha } from '@/lib/formato'

/**
 * UC-13 (Ver detalle de un proyecto): `GET /proyectos/:id` contra el
 * snapshot publicado. 404 amigable si el proyecto no existe ahí (borrado,
 * nunca publicado, o id inválido — el backend responde 400 con
 * `ParseUUIDPipe` para un id mal formado, tratado igual que un 404 aquí).
 */
export function ProyectoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { data: proyecto, isLoading, error } = useProyectoPublico(id)

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
      <Link to="/" className="text-sm underline underline-offset-4">
        ← Volver al inicio
      </Link>

      <div className="grid gap-2">
        <h1 className="text-3xl font-bold">{proyecto.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {formatearFecha(proyecto.fecha_inicio)}
          {proyecto.fecha_fin ? ` – ${formatearFecha(proyecto.fecha_fin)}` : ''}
          {' · '}
          {proyecto.estado}
        </p>
      </div>

      {proyecto.tecnologias.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {proyecto.tecnologias.map((item) => (
            <span
              key={item.tecnologia_id}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
            >
              {item.tecnologia.nombre}
            </span>
          ))}
        </div>
      ) : null}

      <p className="whitespace-pre-line">{proyecto.descripcion}</p>

      {proyecto.imagenes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {proyecto.imagenes.map((imagen) => (
            <img
              key={imagen.media_id}
              src={imagen.media.url}
              alt={imagen.media.alt_text ?? proyecto.titulo}
              className="rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {proyecto.url_demo ? (
          <a
            href={proyecto.url_demo}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Ver demo
          </a>
        ) : null}
        {proyecto.url_repositorio ? (
          <a
            href={proyecto.url_repositorio}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Ver repositorio
          </a>
        ) : null}
      </div>
    </div>
  )
}
