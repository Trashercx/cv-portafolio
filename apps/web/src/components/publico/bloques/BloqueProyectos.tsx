import type { Proyecto } from '@/features/proyectos/types'
import type { ProyectosConfiguracion } from '@/features/secciones/types'
import { EnlaceBloque } from '../contexto-renderizado'

type BloqueProyectosProps = {
  titulo: string
  config: ProyectosConfiguracion
  proyectos: Proyecto[]
}

/** Bloque `proyectos`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueProyectos({
  titulo,
  config,
  proyectos,
}: BloqueProyectosProps) {
  const filtrados = [...proyectos]
    .filter((proyecto) => !config.solo_destacados || proyecto.destacado)
    .sort((a, b) => a.orden - b.orden)
    .slice(0, config.cantidad_a_mostrar)

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay proyectos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((proyecto) => (
            <EnlaceBloque
              key={proyecto.id}
              to={`/proyecto/${proyecto.id}`}
              className="grid gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              {proyecto.imagenes[0] ? (
                <img
                  src={proyecto.imagenes[0].media.url}
                  alt={proyecto.imagenes[0].media.alt_text ?? proyecto.titulo}
                  className="aspect-video rounded-md object-cover"
                />
              ) : null}
              <h3 className="font-semibold">{proyecto.titulo}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {proyecto.descripcion}
              </p>
            </EnlaceBloque>
          ))}
        </div>
      )}
    </div>
  )
}
