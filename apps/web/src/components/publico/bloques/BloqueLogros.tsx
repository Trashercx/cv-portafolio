import type { Logro } from '@/features/logros/types'
import type { LogrosConfiguracion } from '@/features/secciones/types'
import { formatearFecha } from '@/lib/formato'
import { EnlaceBloque } from '../contexto-renderizado'

type BloqueLogrosProps = {
  titulo: string
  config: LogrosConfiguracion
  logros: Logro[]
}

/** Bloque `logros`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueLogros({ titulo, config, logros }: BloqueLogrosProps) {
  const filtrados = [...logros]
    .filter(
      (logro) =>
        !config.categoria_filtro || logro.categoria === config.categoria_filtro,
    )
    .sort((a, b) => a.orden - b.orden)

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay logros.</p>
      ) : (
        <ul className="grid gap-4">
          {filtrados.map((logro) => (
            <li key={logro.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{logro.titulo}</h3>
                <span className="text-xs text-muted-foreground">
                  {formatearFecha(logro.fecha)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {logro.descripcion}
              </p>
              {logro.url_referencia ? (
                <EnlaceBloque
                  href={logro.url_referencia}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  Ver referencia
                </EnlaceBloque>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
