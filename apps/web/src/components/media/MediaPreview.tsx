import { FileIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type MediaPreviewProps = {
  /**
   * `Media.tipo` (o su equivalente inferido del mimetype para un archivo
   * todavía no subido): decide si se previsualiza como imagen o se embebe
   * como documento. Cualquier valor distinto de `"imagen"` (hoy solo
   * `"pdf"` en la práctica) usa la rama de documento.
   */
  tipo: string
  url: string
  alt?: string
  /** Nombre de archivo o descripción corta, mostrado para tipos no-imagen y como título del diálogo. */
  nombre?: string | null
  /** Clases de tamaño/forma de la miniatura clicable (por defecto, cuadrado pequeño con borde). */
  className?: string
  /** `object-fit` de la miniatura. `"contain"` evita recortar logos no cuadrados. */
  fit?: 'cover' | 'contain'
}

/**
 * Miniatura clicable que abre un `Dialog` de zoom/lightbox — feedback
 * externo sobre certificaciones (UC-04): "no se puede verificar
 * autenticidad/legibilidad" del certificado con solo un logo pequeño.
 *
 * Imágenes se amplían con `<img>`; cualquier otro tipo se embebe con
 * `<iframe>` dentro del mismo diálogo, más un enlace para abrirlo en una
 * pestaña nueva. Deliberadamente no usa una librería de lightbox ni
 * `react-pdf`/`pdf.js`: el `Dialog` de shadcn/ui ya cubre el caso.
 */
export function MediaPreview({
  tipo,
  url,
  alt,
  nombre,
  className = 'h-32 w-32 rounded-md border',
  fit = 'cover',
}: MediaPreviewProps) {
  const [open, setOpen] = useState(false)
  const esImagen = tipo === 'imagen'
  const titulo = nombre || (esImagen ? 'Imagen ampliada' : 'Documento')
  const objectFitClass = fit === 'cover' ? 'object-cover' : 'object-contain'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={esImagen ? 'Ampliar imagen' : 'Ver documento'}
        className={cn(
          'overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring',
          className,
        )}
      >
        {esImagen ? (
          <img src={url} alt={alt ?? ''} className={cn('size-full', objectFitClass)} />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 bg-muted p-2 text-center">
            <FileIcon className="size-8 text-muted-foreground" />
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {nombre || 'Ver documento'}
            </span>
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          {esImagen ? (
            <img
              src={url}
              alt={alt ?? ''}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          ) : (
            <div className="grid gap-2">
              {/*
                Fase 4.1, punto 4: `sandbox=""` (el más restrictivo posible)
                bloqueaba el visor de PDF nativo de Chrome, que necesita
                `allow-same-origin` para poder ejecutar su propio plugin de
                render. La URL siempre apunta al bucket S3/CloudFront propio
                de la app (nunca a contenido de terceros embebido), así que
                relajar el sandbox a `allow-same-origin` no expone al admin a
                contenido no confiable. Chrome además necesita `allow-scripts`
                junto con `allow-same-origin` para que su visor nativo de PDF
                (PDFium) pueda inicializarse dentro de un iframe sandboxeado;
                el iframe sigue aislado del origen padre por la same-origin
                policy real del navegador, porque `url` nunca comparte origen
                con esta app.
              */}
              <iframe
                src={url}
                title={titulo}
                sandbox="allow-same-origin allow-scripts"
                className="h-[70vh] w-full rounded-md border"
              />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-sm text-primary underline underline-offset-4"
              >
                Abrir en pestaña nueva
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
