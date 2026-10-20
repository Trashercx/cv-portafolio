import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MiniaturaPdf } from './MiniaturaPdf'
import { VisorPdfDialog } from './VisorPdfDialog'

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
  /** Fase 7m (#68): tamaño del original en bytes, mostrado en la cabecera del visor de PDF. */
  bytes?: number | null
  /** Clases de tamaño/forma de la miniatura clicable (por defecto, cuadrado pequeño con borde). */
  className?: string
  /** `object-fit` de la miniatura. `"contain"` evita recortar logos no cuadrados. */
  fit?: 'cover' | 'contain'
}

/**
 * Miniatura clicable que abre un diálogo de zoom/lightbox — feedback
 * externo sobre certificaciones (UC-04): "no se puede verificar
 * autenticidad/legibilidad" del certificado con solo un logo pequeño.
 *
 * Imágenes se amplían con `<img>` en un `Dialog`. Fase 7m (#66, #68): un PDF
 * muestra la miniatura de su primera página (`MiniaturaPdf`, con el icono de
 * documento como respaldo) y se abre en `VisorPdfDialog` (nombre, tamaño,
 * estado de carga y acciones "Abrir en pestaña nueva" y "Descargar").
 */
export function MediaPreview({
  tipo,
  url,
  alt,
  nombre,
  bytes,
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
          <MiniaturaPdf url={url} alt={nombre || 'Documento PDF'} como="span" />
        )}
      </button>

      {esImagen ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{titulo}</DialogTitle>
            </DialogHeader>
            <img
              src={url}
              alt={alt ?? ''}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : (
        <VisorPdfDialog
          open={open}
          onOpenChange={setOpen}
          url={url}
          nombre={nombre}
          bytes={bytes}
        />
      )}
    </>
  )
}
