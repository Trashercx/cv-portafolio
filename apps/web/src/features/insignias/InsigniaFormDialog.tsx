import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MediaField } from '@/components/media/MediaField'
import { DescartarCambiosDialog } from '@/components/shared/DescartarCambiosDialog'
import { SeccionFormulario } from '@/components/shared/SeccionFormulario'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Media } from '@/features/media/types'
import { useCierreConCambios } from '@/features/shared/useCierreConCambios'
import { useMedia } from '@/features/media/useMediaLibrary'
import { ApiError } from '@/lib/api-client'
import { CamposInsignia, construirPayloadInsignia } from './CamposInsignia'
import {
  INSIGNIA_VALORES_VACIOS,
  insigniaSchema,
  type InsigniaFormValues,
} from './schemas'
import type { Insignia } from './types'
import { useActualizarInsignia } from './useInsignias'

type InsigniaFormDialogProps = {
  insignia: Insignia | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Fase 7d, UC-35: edición de una insignia ya guardada (la creación va por `ImportarInsigniaDialog`). */
export function InsigniaFormDialog({ insignia, open, onOpenChange }: InsigniaFormDialogProps) {
  const actualizar = useActualizarInsignia()
  const { data: imagenExistente } = useMedia(insignia?.imagen_media_id)
  const [imagenElegida, setImagenElegida] = useState<Media | null>(null)
  const imagenPrevia = imagenElegida ?? insignia?.imagen ?? imagenExistente ?? null

  const form = useForm<InsigniaFormValues>({
    resolver: zodResolver(insigniaSchema),
    defaultValues: INSIGNIA_VALORES_VACIOS,
  })

  useEffect(() => {
    if (!open || !insignia) return
    form.reset({
      nombre: insignia.nombre,
      emisor: insignia.emisor,
      descripcion: insignia.descripcion ?? '',
      fecha_emision: insignia.fecha_emision?.slice(0, 10) ?? '',
      fecha_expiracion: insignia.fecha_expiracion?.slice(0, 10) ?? '',
      no_expira: !insignia.fecha_expiracion,
      habilidades: insignia.habilidades ?? [],
      url_verificacion: insignia.url_verificacion ?? '',
      imagen_media_id: insignia.imagen_media_id,
      imagen_url_remota: '',
    })
    setImagenElegida(null)
  }, [open, insignia, form])

  // Fase 7m (#68): cerrar con cambios sin guardar pide confirmación.
  const { abiertoConfirmacion, intentarCerrar, confirmarDescartar, cancelar } = useCierreConCambios(
    form.formState.isDirty,
    onOpenChange,
  )

  const onSubmit = (values: InsigniaFormValues) => {
    if (!insignia) return
    actualizar.mutate(
      { id: insignia.id, payload: construirPayloadInsignia(values, {}, { edicion: true }) },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const errorMessage =
    actualizar.error instanceof ApiError
      ? actualizar.error.message
      : actualizar.error
        ? 'No se pudo guardar la insignia. Intenta de nuevo.'
        : null

  return (
    <>
    <Dialog open={open} onOpenChange={intentarCerrar}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
        <DialogHeader>
          <DialogTitle>Editar insignia</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
              <CamposInsignia form={form} />
              <SeccionFormulario titulo="Imagen">
                {imagenPrevia ? (
                  <img
                    src={imagenPrevia.url}
                    alt={insignia?.nombre ?? 'Imagen de la insignia'}
                    className="mx-auto size-32 object-contain"
                  />
                ) : null}
                <MediaField
                  label="Imagen de la insignia"
                  currentMediaId={form.watch('imagen_media_id')}
                  currentPreviewUrl={imagenPrevia?.url}
                  onUploaded={(media) => {
                    form.setValue('imagen_media_id', media.id, { shouldDirty: true })
                    setImagenElegida(media)
                  }}
                />
                {form.formState.errors.imagen_media_id ? (
                  <p role="alert" className="text-sm text-destructive">{form.formState.errors.imagen_media_id.message}</p>
                ) : null}
              </SeccionFormulario>
              {errorMessage ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={actualizar.isPending}
                  onClick={() => intentarCerrar(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={actualizar.isPending}>
                  {actualizar.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <DescartarCambiosDialog
      open={abiertoConfirmacion}
      onCancelar={cancelar}
      onConfirmar={confirmarDescartar}
    />
    </>
  )
}
