import type { CSSProperties } from 'react'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TemaFormDialog } from '@/features/tema/TemaFormDialog'
import { useActivarTema, useEliminarTema, useTemas } from '@/features/tema/useTemas'
import type { Tema } from '@/features/tema/types'
import { ApiError } from '@/lib/api-client'

const SWATCH_KEYS: Array<{ key: keyof Tema; label: string }> = [
  { key: 'color_primario', label: 'Primario' },
  { key: 'color_secundario', label: 'Secundario' },
  { key: 'color_fondo', label: 'Fondo' },
  { key: 'color_texto', label: 'Texto' },
]

/**
 * Variables CSS del tema, aplicadas sobre el contenedor de vista previa
 * (UC-08). Alcance de "vista previa" en este sprint: una tarjeta de ejemplo
 * dentro de esta misma pantalla de administración (texto, fondo y botones
 * usando estas variables) — el sitio público real todavía no existe
 * (llega en Sprint 4, leyendo el snapshot publicado), así que no hay una
 * página pública que repintar todavía.
 */
function variablesTema(tema: Tema): CSSProperties {
  return {
    '--color-primario': tema.color_primario,
    '--color-secundario': tema.color_secundario,
    '--color-fondo': tema.color_fondo,
    '--color-texto': tema.color_texto,
    fontFamily: tema.fuente_principal,
  } as CSSProperties
}

/** UC-08 (Personalizar tema visual): listado, creación, activación exclusiva y borrado. */
export function TemaPage() {
  const { data: temas, isLoading, error } = useTemas()
  const activar = useActivarTema()
  const eliminar = useEliminarTema()

  const temaActivo = temas?.find((tema) => tema.activo)

  const activarErrorMessage =
    activar.error instanceof ApiError
      ? activar.error.message
      : activar.error
        ? 'No se pudo activar el tema.'
        : null
  const eliminarErrorMessage =
    eliminar.error instanceof ApiError
      ? eliminar.error.message
      : eliminar.error
        ? 'No se pudo eliminar el tema.'
        : null

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tema visual</h1>
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
      {activarErrorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {activarErrorMessage}
        </p>
      ) : null}
      {eliminarErrorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {eliminarErrorMessage}
        </p>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Vista previa del tema activo
        </h2>
        {temaActivo ? (
          <div
            style={variablesTema(temaActivo)}
            className="rounded-lg border p-6"
          >
            <div
              style={{
                backgroundColor: 'var(--color-fondo)',
                color: 'var(--color-texto)',
              }}
              className="grid gap-3 rounded-md border p-6"
            >
              <h3 className="text-xl font-semibold">
                {temaActivo.nombre} ({temaActivo.modo})
              </h3>
              <p>
                Este es un párrafo de ejemplo usando el color de texto y la
                tipografía del tema activo.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  style={{ backgroundColor: 'var(--color-primario)' }}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white"
                >
                  Botón primario
                </button>
                <button
                  type="button"
                  style={{ backgroundColor: 'var(--color-secundario)' }}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white"
                >
                  Botón secundario
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no hay ningún tema activo.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(temas ?? []).map((tema) => (
          <Card key={tema.id} className={tema.activo ? 'border-primary' : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {tema.nombre}
                {tema.activo ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Activo
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex gap-2">
                {SWATCH_KEYS.map(({ key, label }) => (
                  <span
                    key={key}
                    title={`${label}: ${String(tema[key])}`}
                    style={{ backgroundColor: String(tema[key]) }}
                    className="size-8 rounded-full border"
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
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
