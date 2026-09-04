import type { Logro } from '@/features/logros/types'
import { formatearFecha } from '@/lib/formato'

type DetalleLogroContenidoProps = {
  logro: Logro
}

/**
 * Contenido de detalle de un logro (UC-13, Fase 4.3): Logros nunca tuvo
 * página/modal de detalle propio, así que este componente es nuevo — mismo
 * nivel de fidelidad visual que `DetalleProyectoContenido`/
 * `DetalleCertificacionContenido` (título grande, fecha, descripción
 * completa sin truncar, link de referencia si existe), a partir de los
 * campos de `Logro` (`titulo`, `descripcion`, `fecha`, `categoria`,
 * `url_referencia`).
 */
export function DetalleLogroContenido({ logro }: DetalleLogroContenidoProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-3xl font-bold">{logro.titulo}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{formatearFecha(logro.fecha)}</span>
          {logro.categoria ? (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {logro.categoria}
            </span>
          ) : null}
        </div>
      </div>

      <p className="whitespace-pre-line">{logro.descripcion}</p>

      {logro.url_referencia ? (
        <a
          href={logro.url_referencia}
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Ver referencia
        </a>
      ) : null}
    </div>
  )
}
