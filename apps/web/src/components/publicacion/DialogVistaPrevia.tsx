import { useState } from 'react'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import { RenderizadorSecciones } from '@/components/publico/RenderizadorSecciones'
import { useTheme } from '@/components/theme/ThemeProvider'
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
import type { ModoTema } from '@/lib/tema-oscuro'
import { cn } from '@/lib/utils'

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
 * del `toolbar` que arma `EditorSeccionesPage` y que viaja como prop a
 * `LienzoPuck` (hasta Fase 5, dentro de `overrides.headerActions` de
 * `<Puck>` — una función/objeto literal nuevo en cada render de
 * `EditorSeccionesPage` que Puck remontaba como subárbol en cada cambio de
 * esa referencia, confirmado en `node_modules/@puckeditor/core/dist/index.js`:
 * `headerActions` se usaba como tipo de componente JSX). Como la
 * invalidación de `VERSIONES_QUERY_KEY` que dispara
 * `usePreviewVersion.onSuccess` (ver `usePublicacion.ts`) re-renderiza
 * `EditorSeccionesPage` (misma query que alimenta el badge Borrador/
 * Publicado), un `useState` local acá se reseteaba a `open=false` en cada
 * apertura — el síntoma reportado de "la vista previa se cierra sola".
 * Levantar el estado al padre (que nunca se remonta) resuelve la causa raíz,
 * y se mantiene así aunque Fase 5 ya no remonte ese subárbol en cada render
 * (es una invariante barata de conservar).
 *
 * Modo oscuro (Fase 4.6, corregido): mismo tratamiento que `PuckRoot` (el
 * otro "lienzo" que previsualiza el sitio dentro del panel) — refleja el
 * toggle de `ThemeProvider` del panel con la misma paleta oscura derivada
 * (variables CSS) y, además, con la clase `dark` en el contenedor, para que
 * los tokens genéricos de shadcn/Tailwind que usan los `Bloque*.tsx`
 * (`text-muted-foreground`, `bg-card`, etc.) también conmuten — sin esa
 * clase quedaban fijos en su valor claro. Así este diálogo no diverja
 * visualmente del lienzo real.
 */
export function DialogVistaPrevia({
  open,
  onOpenChange,
  previewVersion,
  onPreviewVersion,
}: DialogVistaPreviaProps) {
  const preview = usePreviewVersion()
  const { theme } = useTheme()
  const modo: ModoTema = theme === 'dark' ? 'oscuro' : 'claro'
  // Nodo DOM del `<div>` interior temado (mismo criterio que `PublicHomePage`
  // — `useState`, no `useRef`, porque necesitamos re-render cuando el nodo
  // real se monta), pasado como `container` a `ProveedorDetallePublico` para
  // que el modal de detalle de proyecto/certificación/logro monte dentro del
  // árbol con las variables CSS del tema y la clase `dark`, en vez de como
  // hermano de `document.body` (fix tema/modo oscuro en modales públicos).
  const [nodoTemado, setNodoTemado] = useState<HTMLDivElement | null>(null)

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
        <Button variant="outline" size="sm">Vista previa</Button>
      </DialogTrigger>
      <DialogContent className="flex h-[90dvh] flex-col sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Vista previa</DialogTitle>
          <DialogDescription>
            Así se ve el sitio con el contenido guardado actualmente. Las
            secciones ocultas se muestran atenuadas: no se publicarán.
          </DialogDescription>
        </DialogHeader>
        {/*
          Gutter exterior (Fase 4.1, punto 4): en modo oscuro, tanto
          `DialogContent` (`bg-background`) como el `<div>` interior temado
          (`--color-fondo` derivado en oscuro) quedan casi negros y
          visualmente indistinguibles entre sí. `bg-muted` es un token
          shadcn perceptiblemente más claro que `--background` en oscuro,
          así que separa "el modal" de "el sitio previsualizado dentro del
          modal" con una diferencia real, no cosmética. El scroll vive acá
          afuera; el `<div>` temado de adentro se lee como una tarjeta/
          artboard independiente (`shadow-sm`), no full-bleed contra el
          modal.
        */}
        <div className="flex-1 overflow-y-auto scrollbar-fina rounded-lg border bg-muted p-3">
          <div
            ref={setNodoTemado}
            style={
              previewVersion?.snapshot.tema
                ? temaComoVariablesCss(previewVersion.snapshot.tema, modo)
                : undefined
            }
            className={cn(
              'rounded-md border shadow-sm',
              modo === 'oscuro' && 'dark',
            )}
          >
            {preview.isPending && !previewVersion ? (
              <p className="p-4 text-sm text-muted-foreground">
                Generando vista previa…
              </p>
            ) : null}
            {previewVersion ? (
              // `ProveedorDetallePublico` (Fase 4.3): sin envolver acá, un
              // click en una tarjeta de proyecto/certificación/logro dentro
              // de esta vista previa navegaba fuera del panel admin hacia
              // `/proyecto/:id` (`RenderizadorSecciones`, sin
              // `ProveedorModoRenderizado` explícito, default a modo
              // `'publico'` con `Link` real — ver `contexto-renderizado.tsx`).
              // Envolver acá corrige ese salto: el click ahora abre el mismo
              // modal de detalle que en el sitio público, sin sacar al admin
              // de `EditorSeccionesPage`. `container={nodoTemado}` además
              // monta ese modal dentro de este `<div>` temado (fix tema/modo
              // oscuro en modales públicos), no como hermano de
              // `document.body`.
              <ProveedorDetallePublico container={nodoTemado}>
                <RenderizadorSecciones
                  snapshot={previewVersion.snapshot}
                  soloVisibles={false}
                />
              </ProveedorDetallePublico>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
