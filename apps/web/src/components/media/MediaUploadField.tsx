import { useEffect, useId, useRef, useState } from 'react'
import { MediaPreview } from '@/components/media/MediaPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { prepararArchivoParaSubir } from '@/features/media/heic-a-jpeg'
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
  /**
   * `Media.tipo` de `currentMediaId`/`currentPreviewUrl`, si el llamador ya
   * lo conoce (p. ej. certificación con logo en imagen o PDF). Por defecto
   * `"imagen"` — comportamiento histórico, válido para perfil y galería de
   * proyectos, que solo aceptan imágenes.
   */
  currentMediaTipo?: string | null
  /** Se llama con el Media completo devuelto por el servidor tras subir. */
  onUploaded: (media: Media) => void
  /** Permite quitar la referencia actual sin subir un archivo nuevo. */
  onClear?: () => void
  disabled?: boolean
}

/** `Media.tipo` equivalente de un mimetype de archivo local, para previsualizarlo antes de subirlo (mismo criterio que `MediaService.inferirTipo` en el backend). */
function tipoDesdeMime(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'imagen'
  if (mimetype === 'application/pdf') return 'pdf'
  return 'archivo'
}

/** Fase 7g (UC-09): `Media.tipo` esperable de un archivo según su formato detectado (un `.heic` ya llega convertido a JPEG). */
function tipoDelArchivo(file: File): string {
  const porMime = tipoDesdeMime(file.type)
  if (porMime !== 'archivo') return porMime
  return /\.pdf$/i.test(file.name) ? 'pdf' : 'imagen'
}

/**
 * Input de archivo reutilizable que sube a `POST /admin/media` (con cookie
 * de sesión, nunca a una URL pre-firmada) y devuelve el `media_id`
 * resultante al formulario que lo use vía `onUploaded`.
 *
 * Flujo de confirmación en dos pasos: elegir un archivo NO sube de
 * inmediato — solo lo deja "pendiente de confirmar" (con su propia
 * previsualización y los botones "Subir"/"Cancelar"). Solo "Subir" dispara
 * la mutación; "Cancelar" descarta la selección sin tocar la red y, si ya
 * había un archivo confirmado antes, vuelve a mostrarlo tal cual estaba.
 */
export function MediaUploadField({
  label,
  accept,
  tipo,
  currentMediaId,
  currentPreviewUrl,
  currentMediaTipo,
  onUploaded,
  onClear,
  disabled,
}: MediaUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null)
  const [previewPendienteUrl, setPreviewPendienteUrl] = useState<
    string | null
  >(null)
  // Previsualización local del último archivo SUBIDO CON ÉXITO en esta
  // sesión: se muestra en el estado "confirmado" en vez de esperar a que el
  // formulario padre reciba una `currentPreviewUrl` fresca (que en perfil/
  // certificaciones nunca llega — ver el comentario de `currentMediaId`).
  const [previewConfirmadoUrl, setPreviewConfirmadoUrl] = useState<
    string | null
  >(null)
  // `Media.tipo` real (de la respuesta del servidor) del último archivo
  // subido con éxito en esta sesión, para decidir cómo previsualizarlo
  // (imagen vs. documento embebido) sin depender de `currentMediaTipo`.
  const [previewConfirmadoTipo, setPreviewConfirmadoTipo] = useState<
    string | null
  >(null)
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const upload = useUploadMedia()

  // Refs que siempre reflejan el último valor de cada estado: se usan solo
  // para leer el valor VIGENTE en el cleanup de desmontaje de abajo. No se
  // puede lograr esto con las dependencias del efecto (`[previewPendienteUrl,
  // previewConfirmadoUrl]`) porque `handleSubir` "transfiere" el mismo blob
  // URL de pendiente a confirmado (mismo string, cambia de dueño): si el
  // efecto se re-ejecutara por ese cambio de dependencia, su cleanup
  // revocaría el blob justo cuando pasa a ser el `previewConfirmadoUrl`
  // vigente, rompiendo la imagen recién confirmada. Con refs + deps `[]`,
  // el cleanup solo corre al desmontar el componente de verdad.
  const previewPendienteUrlRef = useRef(previewPendienteUrl)
  const previewConfirmadoUrlRef = useRef(previewConfirmadoUrl)

  // Sincroniza los refs de arriba en cada render (nunca durante el render en
  // sí, para no disparar el lint `react(refs)` de "accessing refs during
  // render" ni arriesgar lecturas inconsistentes bajo Strict Mode).
  useEffect(() => {
    previewPendienteUrlRef.current = previewPendienteUrl
  }, [previewPendienteUrl])
  useEffect(() => {
    previewConfirmadoUrlRef.current = previewConfirmadoUrl
  }, [previewConfirmadoUrl])

  // Libera los object URL locales vigentes al desmontar. Las transiciones
  // intermedias (nueva selección, cancelar, quitar, confirmar subida) ya
  // revocan explícitamente el valor anterior en cada handler de abajo.
  useEffect(() => {
    return () => {
      if (previewPendienteUrlRef.current) {
        URL.revokeObjectURL(previewPendienteUrlRef.current)
      }
      if (previewConfirmadoUrlRef.current) {
        URL.revokeObjectURL(previewConfirmadoUrlRef.current)
      }
    }
  }, [])

  const limpiarInput = () => {
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const original = event.target.files?.[0]
    if (!original) return

    // Fase 7g (UC-09): formato por contenido (un `.heic` llega con `type` vacío en
    // Windows) y conversión HEIC → JPEG antes de armar la vista previa.
    setErrorLocal(null)
    setConvirtiendo(true)
    const preparado = await prepararArchivoParaSubir(original)
    setConvirtiendo(false)
    if ('error' in preparado) {
      setErrorLocal(preparado.error)
      limpiarInput()
      return
    }
    const file = preparado.file

    setPreviewPendienteUrl((previo) => {
      if (previo) URL.revokeObjectURL(previo)
      // Tras la detección solo quedan imágenes y PDF, ambos previsualizables.
      return URL.createObjectURL(file)
    })
    setArchivoPendiente(file)
  }

  const handleSubir = () => {
    if (!archivoPendiente) return

    upload.mutate(
      { file: archivoPendiente, tipo },
      {
        onSuccess: (media) => {
          onUploaded(media)
          setPreviewConfirmadoUrl((previo) => {
            if (previo) URL.revokeObjectURL(previo)
            return previewPendienteUrl
          })
          setPreviewConfirmadoTipo(media.tipo)
          setPreviewPendienteUrl(null)
          setArchivoPendiente(null)
        },
      },
    )
  }

  const handleCancelar = () => {
    setPreviewPendienteUrl((previo) => {
      if (previo) URL.revokeObjectURL(previo)
      return null
    })
    setArchivoPendiente(null)
    limpiarInput()
  }

  const handleQuitar = () => {
    setPreviewConfirmadoUrl((previo) => {
      if (previo) URL.revokeObjectURL(previo)
      return null
    })
    setPreviewConfirmadoTipo(null)
    limpiarInput()
    onClear?.()
  }

  const previewConfirmado = previewConfirmadoUrl ?? currentPreviewUrl ?? null
  const previewConfirmadoTipoResuelto =
    previewConfirmadoTipo ?? currentMediaTipo ?? 'imagen'
  const errorMessage =
    errorLocal ??
    (upload.error instanceof ApiError
      ? upload.error.message
      : upload.error
        ? 'No se pudo subir el archivo. Intenta de nuevo.'
        : null)

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{label}</Label>

      {archivoPendiente ? (
        <div className="grid gap-2">
          {previewPendienteUrl ? (
            <MediaPreview
              tipo={tipoDelArchivo(archivoPendiente)}
              url={previewPendienteUrl}
              nombre={archivoPendiente.name}
              bytes={archivoPendiente.size}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {archivoPendiente.name}
            </p>
          )}
          <p className="text-xs font-medium text-muted-foreground">
            Pendiente de subir
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={upload.isPending || convirtiendo}
              onClick={handleSubir}
            >
              {upload.isPending ? 'Subiendo…' : 'Subir'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={upload.isPending}
              onClick={handleCancelar}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {previewConfirmado ? (
            <MediaPreview tipo={previewConfirmadoTipoResuelto} url={previewConfirmado} />
          ) : currentMediaId ? (
            <p className="text-sm text-muted-foreground">
              Archivo ya cargado (sin previsualización disponible).
            </p>
          ) : null}

          {convirtiendo ? (
            <p role="status" className="text-sm text-muted-foreground">
              Preparando…
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={accept}
              disabled={disabled || convirtiendo}
              onChange={(event) => void handleFileChange(event)}
            />
            {(currentMediaId || previewConfirmado) && onClear ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={handleQuitar}
              >
                Quitar
              </Button>
            ) : null}
          </div>
        </>
      )}

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
