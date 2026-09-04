import { RenderizadorSecciones } from '@/components/publico/RenderizadorSecciones'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePreviewVersion } from '@/features/publicacion/usePublicacion'
import type { VersionSitio } from '@/features/publicacion/types'
import { temaComoVariablesCss } from '@/lib/tema-css'

type DialogVistaPreviaProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  previewVersion: VersionSitio | null
  onPreviewVersion: (version: VersionSitio) => void
}

/**
 * UC-10 (Previsualizar cambios): botón "Vista previa" propio para la barra
 * de acciones de `EditorSeccionesPage`, con un `Dialog` casi a pantalla
 * completa — a diferencia de la previsualización que ya vive dentro del
 * `Dialog` de "Historial de versiones" (`PanelVersiones`), encerrada en
 * `max-h-[24rem]` y pensada para revisar junto al historial, no para
 * inspeccionar el sitio con espacio real.
 *
 * Reusa `usePreviewVersion` (mismo `POST /admin/versiones/preview` que ya
 * usa `PanelVersiones`) en vez de duplicar el endpoint: cada apertura del
 * diálogo dispara una nueva vista previa contra el contenido en vivo
 * (secciones + tema + contenido actuales), para que siempre refleje lo que
 * hay en el lienzo en ese momento.
 *
 * `open`/`previewVersion` son props CONTROLADAS por `EditorSeccionesPage`
 * (Fase 4.1, punto 2), no estado interno: este componente se monta dentro
 * de `overrides.headerActions` de `<Puck>`, una función/objeto literal nuevo
 * en cada render de `EditorSeccionesPage` — Puck remonta ese subárbol cada
 * vez que cambia esa referencia (confirmado en
 * `node_modules/@measured/puck/dist/index.js`: `headerActions` se usa como
 * tipo de componente JSX). Como la invalidación de `VERSIONES_QUERY_KEY` que
 * dispara `usePreviewVersion.onSuccess` (ver `usePublicacion.ts`) re-renderiza
 * `EditorSeccionesPage` (misma query que alimenta el badge Borrador/
 * Publicado), un `useState` local acá se reseteaba a `open=false` en cada
 * apertura — el síntoma reportado de "la vista previa se cierra sola".
 * Levantar el estado al padre (que nunca se remonta) resuelve la causa raíz.
 */
export function DialogVistaPrevia({
  open,
  onOpenChange,
  previewVersion,
  onPreviewVersion,
}: DialogVistaPreviaProps) {
  const preview = usePreviewVersion()

  const handleOpenChange = (siguienteAbierto: boolean) => {
    onOpenChange(siguienteAbierto)
    if (siguienteAbierto) {
      preview.mutate(undefined, {
        onSuccess: (version) => onPreviewVersion(version),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Vista previa</Button>
      </DialogTrigger>
      <DialogContent className="flex h-[90vh] flex-col sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Vista previa</DialogTitle>
          <DialogDescription>
            Así se ve el sitio con el contenido guardado actualmente. Las
            secciones ocultas se muestran atenuadas: no se publicarán.
          </DialogDescription>
        </DialogHeader>
        <div
          style={
            previewVersion?.snapshot.tema
              ? temaComoVariablesCss(previewVersion.snapshot.tema)
              : undefined
          }
          className="flex-1 overflow-y-auto rounded-lg border"
        >
          {preview.isPending && !previewVersion ? (
            <p className="p-4 text-sm text-muted-foreground">
              Generando vista previa…
            </p>
          ) : null}
          {previewVersion ? (
            <RenderizadorSecciones
              snapshot={previewVersion.snapshot}
              soloVisibles={false}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
