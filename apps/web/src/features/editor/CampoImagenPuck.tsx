import { ImageIcon, ImagePlus, X } from 'lucide-react'
import { useState } from 'react'
import { BibliotecaMediaDialog } from '@/components/media/BibliotecaMediaDialog'
import { Button } from '@/components/ui/button'
import { ImagenResponsive } from '@/components/publico/ImagenResponsive'
import { useMediaList } from '@/features/media/useMediaLibrary'
import { nombreArchivo } from '@/features/media/utilidades-media'
import { cn } from '@/lib/utils'

type CampoImagenPuckProps = {
  value: string | undefined
  onChange: (value: string | undefined) => void
  /** Si la imagen es opcional se ofrece "Quitar" (fondo del hero); en la galería es obligatoria. */
  opcional?: boolean
  readOnly?: boolean
}

/**
 * Campo de imagen del editor visual (Fase 7k, UC-07/UC-09/UC-18): en lugar
 * del `<select>` de texto, muestra la miniatura y el nombre de la imagen
 * elegida y abre la biblioteca con miniaturas (`BibliotecaMediaDialog`) para
 * elegir o subir otra. `useMediaList()` sin filtro comparte la caché que ya
 * usa `useDatosEditor` para `mediaPorId`.
 */
export function CampoImagenPuck({ value, onChange, opcional = false, readOnly }: CampoImagenPuckProps) {
  const [abierto, setAbierto] = useState(false)
  const { data: media, isLoading } = useMediaList()
  const elegida = value ? media?.find((item) => item.id === value) : undefined
  const nombre = elegida ? nombreArchivo(elegida) : null

  return (
    <div className="grid gap-2">
      {/* Vista previa decorativa; también abre la biblioteca con el ratón (el
          botón de abajo es el control accesible equivalente). */}
      <div
        aria-hidden="true"
        onClick={readOnly ? undefined : () => setAbierto(true)}
        className={cn(
          'grid gap-1.5 rounded-md border border-dashed border-input p-1.5',
          readOnly ? 'opacity-60' : 'cursor-pointer transition-colors hover:border-primary hover:bg-muted/40',
        )}
      >
        {elegida ? (
          <ImagenResponsive
            media={elegida}
            alt=""
            sizes="16rem"
            className="aspect-video w-full rounded bg-muted object-cover"
          />
        ) : (
          <span className="grid aspect-video w-full place-items-center rounded bg-muted text-muted-foreground">
            <span className="grid justify-items-center gap-1 text-xs">
              <ImageIcon className="size-6" aria-hidden="true" />
              {value && isLoading ? 'Cargando…' : value ? 'Imagen no encontrada' : 'Sin imagen'}
            </span>
          </span>
        )}
        {nombre ? (
          <span className="truncate px-0.5 text-xs text-muted-foreground" title={nombre}>
            {nombre}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={readOnly}
          onClick={() => setAbierto(true)}
          aria-label={nombre ? `Cambiar imagen: ${nombre}` : 'Elegir imagen'}
        >
          <ImagePlus />
          {elegida ? 'Cambiar' : 'Elegir imagen'}
        </Button>
        {opcional && value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={() => onChange(undefined)}
            aria-label="Quitar imagen"
          >
            <X />
          </Button>
        ) : null}
      </div>
      <BibliotecaMediaDialog
        open={abierto}
        onOpenChange={setAbierto}
        seleccionadoId={value}
        onSeleccionar={(item) => onChange(item.id)}
      />
    </div>
  )
}
