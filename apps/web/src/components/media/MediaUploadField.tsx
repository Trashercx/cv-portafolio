import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUploadMedia } from '@/features/media/useUploadMedia'
import type { Media } from '@/features/media/types'
import { ApiError } from '@/lib/api-client'

type MediaUploadFieldProps = {
  /** Texto descriptivo mostrado sobre el input (el `<Label>` lo maneja el formulario que lo envuelve). */
  label: string
  /** `accept` del input nativo, p. ej. "image/*" o "application/pdf". */
  accept?: string
  /** `tipo` enviado al backend (se infiere del mimetype si se omite). */
  tipo?: string
  /**
   * `media_id` ya guardado para este campo (perfil/certificación existente).
   * El contrato de `GET /admin/perfil` y `GET /admin/certificaciones` no
   * incluye la URL del Media asociado, solo su id — por eso, si no hubo una
   * subida nueva en esta sesión, solo se puede mostrar el id, no una miniatura.
   */
  currentMediaId?: string | null
  /**
   * URL de previsualización ya conocida por el formulario padre (p. ej. la
   * galería de imágenes de un proyecto, que sí incluye `media.url`).
   */
  currentPreviewUrl?: string | null
  /** Se llama con el Media completo devuelto por el servidor tras subir. */
  onUploaded: (media: Media) => void
  /** Permite quitar la referencia actual sin subir un archivo nuevo. */
  onClear?: () => void
  disabled?: boolean
}

/**
 * Input de archivo reutilizable que sube directo a `POST /admin/media` (con
 * cookie de sesión, nunca a una URL pre-firmada) y devuelve el `media_id`
 * resultante al formulario que lo use vía `onUploaded`. Muestra
 * previsualización cuando el archivo (nuevo o ya conocido) es una imagen.
 */
export function MediaUploadField({
  label,
  accept,
  tipo,
  currentMediaId,
  currentPreviewUrl,
  onUploaded,
  onClear,
  disabled,
}: MediaUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const upload = useUploadMedia()

  // Libera el object URL local al desmontar o reemplazar la selección.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      setLocalPreviewUrl((previo) => {
        if (previo) URL.revokeObjectURL(previo)
        return URL.createObjectURL(file)
      })
    } else {
      setLocalPreviewUrl(null)
    }

    upload.mutate(
      { file, tipo },
      {
        onSuccess: (media) => onUploaded(media),
      },
    )
  }

  const previewUrl = localPreviewUrl ?? currentPreviewUrl ?? null
  const errorMessage =
    upload.error instanceof ApiError
      ? upload.error.message
      : upload.error
        ? 'No se pudo subir el archivo. Intenta de nuevo.'
        : null

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="h-32 w-32 rounded-md border object-cover"
        />
      ) : currentMediaId ? (
        <p className="text-sm text-muted-foreground">
          Archivo ya cargado (sin previsualización disponible).
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled || upload.isPending}
          onChange={handleFileChange}
        />
        {(currentMediaId || previewUrl) && onClear ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || upload.isPending}
            onClick={() => {
              setLocalPreviewUrl((previo) => {
                if (previo) URL.revokeObjectURL(previo)
                return null
              })
              if (inputRef.current) inputRef.current.value = ''
              onClear()
            }}
          >
            Quitar
          </Button>
        ) : null}
      </div>

      {upload.isPending ? (
        <p className="text-sm text-muted-foreground">Subiendo…</p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
