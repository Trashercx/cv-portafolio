import type { Proyecto } from '@/features/proyectos/types'
import { formatearFecha } from '@/lib/formato'

type DetalleProyectoContenidoProps = {
  proyecto: Proyecto
}

/**
 * Contenido de detalle de un proyecto (UC-13), sin loading/error ni
 * navegación propia: extraído de `ProyectoDetallePage` (Fase 4.3) para
 * poder reusarse tanto en la página standalone (`/proyecto/:id`) como en el
 * modal que abre `ProveedorDetallePublico` al hacer click en una tarjeta
 * desde la home. El objeto `proyecto` ya viene completo (con
 * `tecnologias`/`imagenes`) en ambos casos — ver `SnapshotSitio.proyectos`
 * y `useProyectoPublico`.
 */
export function DetalleProyectoContenido({ proyecto }: DetalleProyectoContenidoProps) {
  return (
    <div className="grid gap-6">
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
