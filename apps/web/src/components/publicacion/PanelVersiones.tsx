import { useState } from 'react'
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog'
import { RenderizadorSecciones } from '@/components/publico/RenderizadorSecciones'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  usePreviewVersion,
  useRevertirVersion,
  useVersiones,
} from '@/features/publicacion/usePublicacion'
import type { VersionSitio } from '@/features/publicacion/types'
import { ApiError } from '@/lib/api-client'
import { temaComoVariablesCss } from '@/lib/tema-css'

function mensajeDeError(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function formatearFechaHora(fecha: string | null): string {
  if (!fecha) return 'Sin publicar (borrador)'
  return new Date(fecha).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * UC-10 (Previsualizar cambios) y la parte de "historial + deshacer" de
 * UC-11 (Publicar o revertir una versión), extraídas como componente
 * compartido para que `EditorSeccionesPage` pueda mostrarlas sin salir del
 * editor (Sprint 7, fusión de Editor visual + Publicación) sin duplicar este
 * JSX. El botón "Publicar" en sí vive en la barra superior de
 * `EditorSeccionesPage` (es el "botón único de publicación" del reporte), no
 * aquí.
 *
 * "La actual" = la versión `publicado` de `publicado_en` más reciente (mismo
 * criterio que `VersionesSitioService.obtenerUltimaPublicada`, que es lo que
 * lee el sitio público).
 *
 * `POST /admin/versiones/:id/revertir` restaura la versión publicada
 * INMEDIATAMENTE ANTERIOR a la que se le pasa como `:id` — no el snapshot de
 * esa misma fila. Por eso el botón "Deshacer última publicación" solo puede
 * mostrarse en la fila publicada inmediatamente anterior a "la actual" (es
 * el único contenido al que se puede volver deshaciendo la publicación más
 * reciente), y al confirmarlo se llama a la mutación con el id de "la
 * actual" (no el de esa fila) para que el backend restaure justo esa fila.
 */
export function PanelVersiones() {
  const versionesQuery = useVersiones()
  const preview = usePreviewVersion()
  const revertir = useRevertirVersion()

  const [previewVersion, setPreviewVersion] = useState<VersionSitio | null>(
    null,
  )
  const [revirtiendo, setRevirtiendo] = useState(false)

  const versiones = versionesQuery.data ?? []
  const versionesPublicadasPorFecha = versiones
    .filter((version) => version.estado === 'publicado')
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publicado_en ?? 0).getTime() -
        new Date(a.publicado_en ?? 0).getTime(),
    )
  const actual = versionesPublicadasPorFecha[0]
  const anteriorInmediataALaActual = versionesPublicadasPorFecha[1]

  const handlePreview = () => {
    preview.mutate(undefined, {
      onSuccess: (version) => setPreviewVersion(version),
    })
  }

  /**
   * Siempre revierte pasando `actual.id`, nunca el `id` de la fila donde
   * aparece el botón: `POST /admin/versiones/:id/revertir` restaura la
   * publicada INMEDIATAMENTE ANTERIOR a `:id`, así que para "deshacer la
   * última publicación" (recuperar el contenido de
   * `anteriorInmediataALaActual`, la fila donde se muestra el botón) hay que
   * pasar el id de la versión actual, no el de esa fila.
   */
  const handleRevertir = () => {
    if (!actual) return
    setRevirtiendo(true)
    revertir.mutate(actual.id, {
      onSettled: () => setRevirtiendo(false),
    })
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Vista previa
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={preview.isPending}
          >
            {preview.isPending
              ? 'Generando vista previa…'
              : 'Previsualizar cambios'}
          </Button>
        </div>

        {previewVersion ? (
          <div
            style={
              previewVersion.snapshot.tema
                ? temaComoVariablesCss(previewVersion.snapshot.tema)
                : undefined
            }
            className="max-h-[24rem] overflow-y-auto rounded-lg border"
          >
            <RenderizadorSecciones
              snapshot={previewVersion.snapshot}
              soloVisibles={false}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Las secciones ocultas se mostrarán atenuadas: no se publicarán.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-sm font-medium text-muted-foreground">
          Historial de versiones
        </h2>

        {versionesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Cargando historial…
          </p>
        ) : null}
        {versionesQuery.error ? (
          <p role="alert" className="text-sm text-destructive">
            {mensajeDeError(
              versionesQuery.error,
              'No se pudo cargar el historial de versiones.',
            )}
          </p>
        ) : null}
        {versiones.length === 0 && !versionesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">
            Todavía no se generó ninguna versión.
          </p>
        ) : null}

        {versiones.length > 0 ? (
          <ul className="grid gap-2">
            {versiones.map((version) => {
              const esLaActual = actual?.id === version.id
              const puedeRevertir =
                anteriorInmediataALaActual?.id === version.id

              return (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        version.estado === 'publicado' ? 'default' : 'secondary'
                      }
                    >
                      {version.estado === 'publicado' ? 'Publicado' : 'Borrador'}
                    </Badge>
                    {esLaActual ? <Badge variant="outline">Actual</Badge> : null}
                    <span className="text-sm text-muted-foreground">
                      {formatearFechaHora(version.publicado_en)}
                    </span>
                  </div>

                  {puedeRevertir ? (
                    <ConfirmActionDialog
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={revertir.isPending}
                        >
                          Deshacer última publicación
                        </Button>
                      }
                      title="¿Deshacer la última publicación?"
                      description="Se restaurará esta versión (la publicada inmediatamente antes de la actual) como una nueva publicación. El historial completo se conserva."
                      confirmLabel="Deshacer"
                      pendingLabel="Revirtiendo…"
                      isPending={revirtiendo}
                      onConfirm={handleRevertir}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
