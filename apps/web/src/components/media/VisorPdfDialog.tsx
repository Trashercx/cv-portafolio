import { Download, ExternalLink, Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatearBytes } from '@/lib/formato'

/** Tras este tiempo sin `load` se avisa que se puede abrir en otra pestaña (móviles sin visor embebido). */
const MS_AVISO_LENTO = 8000

type VisorPdfDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  /** Nombre del documento (título del diálogo y nombre sugerido al descargar). */
  nombre?: string | null
  /** Tipo mostrado en la cabecera (por defecto "PDF"). */
  tipo?: string
  /** Tamaño del original; sin dato (archivos anteriores a `Media.bytes`) se omite. */
  bytes?: number | null
}

/**
 * Fase 7m (#66, #68), UC-04/UC-09: visor de PDF en modal. Sustituye al
 * `<object>` suelto de `MediaPreview`: cabecera con nombre, tipo y tamaño,
 * acciones arriba ("Abrir en pestaña nueva" y "Descargar"; el atributo
 * `download` solo se respeta en el mismo origen, en otro el navegador abre el
 * archivo), estado de carga hasta `onLoad` y respaldo con enlace si falla.
 *
 * Se usa `<object type="application/pdf">` y no `<iframe sandbox>`: el visor
 * nativo ya corre aislado y el sandbox adicional lo bloquea (Fase 4.1).
 */
export function VisorPdfDialog({
  open,
  onOpenChange,
  url,
  nombre,
  tipo = 'PDF',
  bytes,
}: VisorPdfDialogProps) {
  const titulo = nombre || 'Documento'
  const detalle = [tipo, formatearBytes(bytes)].filter(Boolean).join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-3 overflow-y-auto scrollbar-fina sm:max-w-3xl">
        <DialogHeader className="pr-6">
          <DialogTitle className="truncate" title={titulo}>
            {titulo}
          </DialogTitle>
          <DialogDescription>{detalle}</DialogDescription>
        </DialogHeader>
        {/* Se monta solo con el diálogo abierto: el estado de carga se reinicia solo. */}
        <CuerpoVisor url={url} titulo={titulo} />
      </DialogContent>
    </Dialog>
  )
}

function CuerpoVisor({ url, titulo }: { url: string; titulo: string }) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [lento, setLento] = useState(false)
  const objeto = useRef<HTMLObjectElement>(null)

  // React no engancha `error` en <object> (solo `load`): se escucha el evento nativo.
  useEffect(() => {
    const nodo = objeto.current
    if (!nodo) return
    const alFallar = () => setEstado('error')
    nodo.addEventListener('error', alFallar)
    return () => nodo.removeEventListener('error', alFallar)
  }, [])

  useEffect(() => {
    if (estado !== 'cargando') return
    const t = window.setTimeout(() => setLento(true), MS_AVISO_LENTO)
    return () => window.clearTimeout(t)
  }, [estado])

  const enlaceAbrir = (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <ExternalLink aria-hidden="true" />
      Abrir en pestaña nueva
    </a>
  )

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          {enlaceAbrir}
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={url} download={titulo} rel="noopener noreferrer">
            <Download aria-hidden="true" />
            Descargar
          </a>
        </Button>
      </div>

      {estado === 'error' ? (
        <div
          role="alert"
          className="flex h-[40dvh] flex-col items-center justify-center gap-3 rounded-md border bg-muted p-4 text-center text-sm"
        >
          <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
          <p>No se pudo mostrar el documento. Puede que no exista o que tu navegador no lo admita.</p>
          <Button asChild size="sm">
            {enlaceAbrir}
          </Button>
        </div>
      ) : (
        <div className="relative">
          {estado === 'cargando' ? (
            <p
              role="status"
              className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 rounded-t-md bg-muted/90 p-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {lento
                ? 'Está tardando. Si no aparece, ábrelo en una pestaña nueva.'
                : 'Cargando documento…'}
            </p>
          ) : null}
          {/* Mismo patrón que tenía `MediaPreview` (Fase 4.1): `<object>`, no `<iframe sandbox>`. */}
          <object
            ref={objeto}
            data={url}
            type="application/pdf"
            aria-label={titulo}
            className="h-[65dvh] w-full rounded-md border"
            onLoad={() => setEstado('listo')}
          >
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
              <p>Tu navegador no pudo mostrar la vista previa del PDF.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                Abrir en pestaña nueva
              </a>
            </div>
          </object>
        </div>
      )}
    </div>
  )
}
