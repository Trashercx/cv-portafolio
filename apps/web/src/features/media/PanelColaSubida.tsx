import { CheckCircle2, RotateCw, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CarpetaMedia } from './types'
import type { EstadoSubida, ItemCola } from './useColaSubida'

const ETIQUETA_ESTADO: Record<EstadoSubida, string> = {
  convirtiendo: 'Convirtiendo…',
  pendiente: 'En espera',
  subiendo: 'Subiendo',
  listo: 'Listo',
  error: 'Error',
  cancelado: 'Cancelado',
}

type PanelColaSubidaProps = {
  items: ItemCola[]
  onCancelar: (id: string) => void
  onReintentar: (id: string) => void
  onLimpiar: () => void
  /** Fase 7e (UC-09): carpetas disponibles y destino de las próximas subidas. */
  carpetas?: CarpetaMedia[]
  /** Id de carpeta o `'ninguna'`. */
  destino?: string
  onCambiarDestino?: (valor: string) => void
}

/**
 * Panel de la cola de subidas (Fase 7d, UC-09): progreso por archivo con
 * cancelar/reintentar. El resumen vive en una región `aria-live` para que los
 * lectores de pantalla anuncien el avance sin leer cada barra.
 */
export function PanelColaSubida({
  items,
  onCancelar,
  onReintentar,
  onLimpiar,
  carpetas,
  destino = 'ninguna',
  onCambiarDestino,
}: PanelColaSubidaProps) {
  // Con selector de destino el panel se muestra siempre (se elige antes de subir).
  if (items.length === 0 && !onCambiarDestino) return null

  const listos = items.filter((i) => i.estado === 'listo').length
  const conError = items.filter((i) => i.estado === 'error').length
  const terminados = items.filter(
    (i) => i.estado === 'listo' || i.estado === 'error' || i.estado === 'cancelado',
  ).length

  return (
    <section
      aria-label="Cola de subida"
      className="grid gap-3 rounded-lg border bg-card p-3"
    >
      {onCambiarDestino ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span id="destino-subida">Subiendo a:</span>
          <Select value={destino} onValueChange={onCambiarDestino}>
            <SelectTrigger className="h-8 w-full sm:w-56" aria-labelledby="destino-subida">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ninguna">Sin carpeta</SelectItem>
              {(carpetas ?? []).map((carpeta) => (
                <SelectItem key={carpeta.id} value={carpeta.id}>
                  {carpeta.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-medium">
            {listos} de {items.length} archivos subidos
            {conError > 0 ? ` (${conError} con error)` : ''}
          </p>
          {terminados > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={onLimpiar}>
              Limpiar terminadas
            </Button>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="grid gap-1" data-estado={item.estado}>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm" title={item.file.name}>
                {item.file.name}
              </p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {item.estado === 'listo' ? (
                  <CheckCircle2 className="size-3.5 text-green-600" aria-hidden="true" />
                ) : null}
                {item.estado === 'error' ? (
                  <XCircle className="size-3.5 text-destructive" aria-hidden="true" />
                ) : null}
                {ETIQUETA_ESTADO[item.estado]}
                {item.estado === 'subiendo' ? ` ${item.progreso}%` : ''}
              </span>
              {item.estado === 'convirtiendo' || item.estado === 'pendiente' || item.estado === 'subiendo' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Cancelar subida de ${item.file.name}`}
                  onClick={() => onCancelar(item.id)}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
              {item.estado === 'error' || item.estado === 'cancelado' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Reintentar subida de ${item.file.name}`}
                  onClick={() => onReintentar(item.id)}
                >
                  <RotateCw className="size-4" />
                </Button>
              ) : null}
            </div>
            {item.estado === 'subiendo' || item.estado === 'listo' ? (
              <Progress
                value={item.progreso}
                aria-label={`Progreso de ${item.file.name}`}
                className="h-1.5"
              />
            ) : null}
            {item.estado === 'error' && item.error ? (
              <p role="alert" className="text-xs text-destructive">
                {item.error}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
