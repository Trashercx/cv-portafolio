import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { TemaFormDialog } from '@/features/tema/TemaFormDialog'
import { useActivarTema, useEliminarTema, useTemas } from '@/features/tema/useTemas'
import type { Tema } from '@/features/tema/types'
import { ApiError } from '@/lib/api-client'
import { temaComoVariablesCss } from '@/lib/tema-css'
import { cn } from '@/lib/utils'

const SWATCH_KEYS: Array<{ key: keyof Tema; label: string }> = [
  { key: 'color_primario', label: 'Primario' },
  { key: 'color_secundario', label: 'Secundario' },
  { key: 'color_fondo', label: 'Fondo' },
  { key: 'color_texto', label: 'Texto' },
]

/**
 * Plugin "Tema" del rail de Puck en el editor unificado (Fase 5, plugin desde Fase 7): mismo
 * listado/creación/activación exclusiva/borrado que la extinta `TemaPage`
 * (UC-08) — se reusan tal cual `useTemas`/`useActivarTema`/`useEliminarTema`
 * y `TemaFormDialog`, sin ninguna lógica de mutación nueva ni duplicada.
 * Único cambio: el grid ancho de la página independiente pasa a una lista
 * vertical compacta, para caber en la columna angosta del panel lateral.
 */
export function PanelTemaEditor() {
  const { data: temas, isLoading, error } = useTemas()
  const activar = useActivarTema()
  const eliminar = useEliminarTema()

  const temaActivo = temas?.find((tema) => tema.activo)

  return (
    <div className="grid gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Tema visual</h3>
        <TemaFormDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando temas…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los temas.'}
        </p>
      ) : null}

      <section className="grid gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          Vista previa del tema activo
        </h4>
        {temaActivo ? (
          <div
            style={temaComoVariablesCss(temaActivo)}
            className="rounded-lg border p-3"
          >
            <div
              style={{
                backgroundColor: 'var(--color-fondo)',
                color: 'var(--color-texto)',
              }}
              className="grid gap-1 rounded-md border p-3 text-sm"
            >
              <p className="font-semibold">
                {temaActivo.nombre} ({temaActivo.modo})
              </p>
              <p className="text-xs">
                Colores y tipografía del tema activo.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no hay ningún tema activo.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        {(temas ?? []).map((tema) => (
          <div
            key={tema.id}
            className={cn(
              'grid gap-2 rounded-lg border p-3',
              tema.activo && 'border-primary',
            )}
          >
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span>{tema.nombre}</span>
              {tema.activo ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Activo
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              {SWATCH_KEYS.map(({ key, label }) => (
                <span
                  key={key}
                  title={`${label}: ${String(tema[key])}`}
                  style={{ backgroundColor: String(tema[key]) }}
                  className="size-6 rounded-full border"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {tema.fuente_principal} · {tema.modo}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={tema.activo || activar.isPending}
                onClick={() => activar.mutate(tema.id)}
              >
                {tema.activo ? 'Activo' : 'Activar'}
              </Button>
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    Eliminar
                  </Button>
                }
                title={`¿Eliminar el tema "${tema.nombre}"?`}
                description="Esta acción no se puede deshacer."
                isPending={eliminar.isPending}
                onConfirm={() => eliminar.mutate(tema.id)}
              />
            </div>
          </div>
        ))}
      </section>

      {temas && temas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay temas creados.
        </p>
      ) : null}
    </div>
  )
}
