import { FileText } from 'lucide-react'
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
 * `<object>` dentro del mismo diálogo, más un enlace para abrirlo en una
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
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#DC2626]/10">
              <FileText className="size-5 text-[#DC2626]" aria-hidden="true" />
            </span>
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
                Fase 4.1, punto 4 (fix definitivo): desde Chrome 78 el visor
                nativo de PDF corre en un iframe cross-process que el propio
                navegador ya aísla — envolverlo en un `<iframe sandbox>`
                adicional entra en conflicto con ese aislamiento y Chrome
                sigue bloqueándolo sin importar la combinación de flags
                (problema documentado en el issue tracker de Chromium y en
                web.dev, no de configuración propia de este proyecto). La
                solución consistente es usar `<object data type=
                "application/pdf">` en su lugar: no necesita sandboxearse
                (el visor ya viene aislado) y soporta contenido de fallback
                nativo si el navegador no puede renderizarlo.
              */}
              <object
                data={url}
                type="application/pdf"
                className="h-[70vh] w-full rounded-md border"
              >
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                  <p>Tu navegador no pudo mostrar la vista previa del PDF.</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    Abrir en pestaña nueva
                  </a>
                </div>
              </object>
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
