import type { Proyecto } from '@/features/proyectos/types'
import type { ProyectosConfiguracion } from '@/features/secciones/types'
import { cn } from '@/lib/utils'
import { EnlaceBloque } from '../contexto-renderizado'

type BloqueProyectosProps = {
  titulo: string
  config: ProyectosConfiguracion
  proyectos: Proyecto[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/** Clase de columnas del grid según `config.columnas` (Fase 3.4). */
const COLUMNAS_CLASE: Record<NonNullable<ProyectosConfiguracion['columnas']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
}

/** Clase de la tarjeta según `config.estilo_tarjeta` (Fase 3.4). */
const ESTILO_TARJETA_CLASE: Record<
  NonNullable<ProyectosConfiguracion['estilo_tarjeta']>,
  string
> = {
  simple: 'border',
  con_sombra: 'border shadow-md',
}

/** Bloque `proyectos`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4). */
export function BloqueProyectos({
  titulo,
  config,
  proyectos,
  alineacionTitulo,
}: BloqueProyectosProps) {
  const filtrados = [...proyectos]
    .filter((proyecto) => !config.solo_destacados || proyecto.destacado)
    .sort((a, b) => a.orden - b.orden)
    .slice(0, config.cantidad_a_mostrar)

  const mostrarDescripcion = config.mostrar_descripcion ?? true

  return (
    <div className="grid gap-6">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay proyectos.</p>
      ) : (
        <div className={cn('grid gap-4', COLUMNAS_CLASE[config.columnas ?? 3])}>
          {filtrados.map((proyecto) => (
            <EnlaceBloque
              key={proyecto.id}
              to={`/proyecto/${proyecto.id}`}
              className={cn(
                'grid gap-2 rounded-lg p-4 transition-colors hover:bg-accent',
                ESTILO_TARJETA_CLASE[config.estilo_tarjeta ?? 'simple'],
              )}
            >
              {proyecto.imagenes[0] ? (
                <img
                  src={proyecto.imagenes[0].media.url}
                  alt={proyecto.imagenes[0].media.alt_text ?? proyecto.titulo}
                  className="aspect-video rounded-md object-cover"
                />
              ) : null}
              <h3 className="font-semibold">{proyecto.titulo}</h3>
              {mostrarDescripcion ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {proyecto.descripcion}
                </p>
              ) : null}
            </EnlaceBloque>
          ))}
        </div>
      )}
    </div>
  )
}
