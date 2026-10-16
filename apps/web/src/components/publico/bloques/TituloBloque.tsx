import { cn } from '@/lib/utils'

type TituloBloqueProps = {
  titulo: string
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE`. */
  alineacion?: string
  /** `config.mostrar_titulo`; ausente = visible (aspecto previo a la Fase 7j). */
  mostrar?: boolean
  /** Clases de tamaño/estilo propias del bloque (por defecto `text-2xl font-semibold`). */
  className?: string
}

/**
 * Título `<h2>` de un bloque (Fase 7j, UC-07). Con `mostrar === false` no se
 * ve, pero sigue en el HTML para lectores de pantalla y el esquema de
 * encabezados de la página (y la navegación sigue usando `titulo_visible`).
 */
export function TituloBloque({ titulo, alineacion, mostrar, className }: TituloBloqueProps) {
  if (mostrar === false) {
    return (
      <h2 className="sr-only" data-titulo-oculto="true">
        {titulo}
      </h2>
    )
  }
  return <h2 className={cn(className ?? 'text-2xl font-semibold', alineacion)}>{titulo}</h2>
}
