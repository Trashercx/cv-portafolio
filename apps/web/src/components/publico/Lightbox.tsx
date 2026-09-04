import { useEffect, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { GaleriaFoto } from '@/features/secciones/types'

type LightboxProps = {
  fotos: GaleriaFoto[]
  indiceInicial: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * UC-18 (Fase 4.5): vista ampliada de una foto de la galería, navegable sin
 * salir del modal — reusable, no acoplada a `BloqueGaleria` (podría abrirse
 * desde el carousel o desde el grid). Construido sobre `components/ui/dialog.tsx`
 * (Radix): el cierre con `Escape` y el clic fuera del contenido ya vienen
 * gratis de `DialogPrimitive.Content`, así que este componente solo agrega
 * la navegación prev/next (flechas superpuestas + `ArrowLeft`/`ArrowRight`).
 *
 * NO es `DialogVistaPrevia` (`@/components/publicacion/DialogVistaPrevia`):
 * ese es un dominio distinto (contenido de página completa dentro del panel
 * admin); este es un componente nuevo enfocado en una sola imagen a pantalla
 * casi completa, usado tanto en el sitio público como en el lienzo del editor.
 */
export function Lightbox({ fotos, indiceInicial, open, onOpenChange }: LightboxProps) {
  const [indice, setIndice] = useState(indiceInicial)

  // El modal puede reabrirse en una foto distinta a la última vista (el
  // usuario cierra en la foto 3 y vuelve a abrir haciendo click en la foto
  // 1) — resincroniza el índice interno cada vez que se abre.
  useEffect(() => {
    if (open) setIndice(indiceInicial)
  }, [open, indiceInicial])

  const total = fotos.length
  const foto = fotos[indice]

  function irAnterior() {
    setIndice((actual) => (actual - 1 + total) % total)
  }

  function irSiguiente() {
    setIndice((actual) => (actual + 1) % total)
  }

  function manejarTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'ArrowLeft') irAnterior()
    else if (evento.key === 'ArrowRight') irSiguiente()
  }

  if (!foto) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={manejarTeclado}
        className="flex h-[90vh] max-w-[95vw] flex-col items-center justify-center gap-4 border-none bg-black/90 p-4 sm:max-w-[90vw]"
      >
        <DialogTitle className="sr-only">{foto.titulo || 'Foto de la galería'}</DialogTitle>
        <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden">
          {total > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 left-2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              onClick={irAnterior}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-6" />
            </Button>
          ) : null}
          <img
            src={foto.media?.url}
            alt={foto.titulo || foto.media?.alt_text || ''}
            className="max-h-full max-w-full object-contain"
          />
          {total > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              onClick={irSiguiente}
              aria-label="Foto siguiente"
            >
              <ChevronRight className="size-6" />
            </Button>
          ) : null}
        </div>
        {foto.titulo ? <p className="text-center text-sm text-white">{foto.titulo}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
