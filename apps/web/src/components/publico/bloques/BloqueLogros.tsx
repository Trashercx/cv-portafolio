import { useAbrirDetalle } from '@/components/publico/contexto-detalle'
import type { Logro } from '@/features/logros/types'
import type { LogrosConfiguracion } from '@/features/secciones/types'
import { formatearFecha } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { EnlaceBloque, TarjetaClicable } from '../contexto-renderizado'

type BloqueLogrosProps = {
  titulo: string
  config: LogrosConfiguracion
  logros: Logro[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/**
 * Tarjeta de un logro (título, fecha, descripción) + el link externo
 * opcional "Ver referencia", usada por ambos estilos de lista
 * (`tarjetas`/`linea_tiempo`) dentro de su propio `<li>`.
 *
 * El link es HERMANO de `TarjetaClicable` (fuera del `<button>`), nunca
 * descendiente: anidar contenido interactivo (`<a>`) dentro de otro
 * contenido interactivo (`<button>`) viola el modelo de contenido de
 * HTML5 y lo señala axe-core con severidad "serious" (regla
 * `nested-interactive`) — algunos lectores de pantalla (p. ej. VoiceOver)
 * pueden podar el subárbol de accesibilidad del descendiente interactivo,
 * dejando "Ver referencia" inalcanzable en navegación por cursor
 * virtual/rotor de enlaces aunque siga respondiendo a `Tab` lineal. Con el
 * link como hermano, ambos elementos son independientes: no hace falta
 * `stopPropagation` (el click en el link ya no burbujea hacia ningún
 * `onClick` de la tarjeta) y el árbol de accesibilidad queda válido sin
 * depender de que cada motor decida no podarlo.
 */
function TarjetaLogro({ logro, onAbrir }: { logro: Logro; onAbrir: () => void }) {
  return (
    <>
      <TarjetaClicable
        onClick={onAbrir}
        aria-label={logro.titulo}
        className="grid w-full gap-1 text-left"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{logro.titulo}</h3>
          <span className="text-xs text-muted-foreground">
            {formatearFecha(logro.fecha)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{logro.descripcion}</p>
      </TarjetaClicable>
      {logro.url_referencia ? (
        <EnlaceBloque
          href={logro.url_referencia}
          target="_blank"
          rel="noreferrer"
          className="w-fit text-sm underline underline-offset-4"
        >
          Ver referencia
        </EnlaceBloque>
      ) : null}
    </>
  )
}

/** Bloque `logros`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4). */
export function BloqueLogros({ titulo, config, logros, alineacionTitulo }: BloqueLogrosProps) {
  const filtrados = [...logros]
    .filter(
      (logro) =>
        !config.categoria_filtro || logro.categoria === config.categoria_filtro,
    )
    .sort((a, b) => a.orden - b.orden)

  const estiloLista = config.estilo_lista ?? 'tarjetas'
  const abrirDetalle = useAbrirDetalle()

  return (
    <div className="grid gap-6">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay logros.</p>
      ) : estiloLista === 'linea_tiempo' ? (
        <ul
          className="grid gap-6 border-l-2 pl-6"
          style={{ borderColor: 'var(--color-primario)' }}
        >
          {filtrados.map((logro) => (
            <li key={logro.id} className="relative grid gap-1">
              <span
                className="absolute top-1.5 -left-[calc(1.5rem+5px)] size-3 rounded-full ring-4 ring-background"
                style={{ backgroundColor: 'var(--color-primario)' }}
                aria-hidden="true"
              />
              <TarjetaLogro
                logro={logro}
                onAbrir={() => abrirDetalle('logro', logro)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-4">
          {filtrados.map((logro) => (
            <li key={logro.id} className="grid gap-1 rounded-lg border p-4">
              <TarjetaLogro
                logro={logro}
                onAbrir={() => abrirDetalle('logro', logro)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
