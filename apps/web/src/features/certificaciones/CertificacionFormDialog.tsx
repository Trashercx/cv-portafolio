import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MediaField } from '@/components/media/MediaField'
import { CampoFechaConCalendario } from '@/components/shared/CampoFechaConCalendario'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Media } from '@/features/media/types'
import { useMedia } from '@/features/media/useMediaLibrary'
import { useConfirmarDescarte } from '@/hooks/useConfirmarDescarte'
import { ApiError } from '@/lib/api-client'
import {
  certificacionSchema,
  type CertificacionFormValues,
} from './certificacion-schema'
import type { Certificacion } from './types'
import {
  useActualizarCertificacion,
  useCrearCertificacion,
} from './useCertificaciones'

const DEFAULT_VALUES: CertificacionFormValues = {
  nombre: '',
  institucion: '',
  fecha_emision: '',
  fecha_expiracion: '',
  url_verificacion: '',
  credencial_id: '',
  logo_media_id: undefined,
  orden: 0,
}

type CertificacionFormDialogProps = {
  certificacion?: Certificacion | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** UC-04 (Gestionar certificaciones): crear/editar dentro de un modal. */
export function CertificacionFormDialog({
  certificacion,
  open,
  onOpenChange,
}: CertificacionFormDialogProps) {
  const esNuevo = !certificacion

  // Ayuda de UX nativa del navegador (defensa adicional, no reemplaza la
  // validación de Zod): la fecha de emisión no puede ser futura, y la de
  // expiración no puede ser anterior/igual a la de emisión ya cargada.
  const hoy = new Date().toISOString().slice(0, 10)

  const crear = useCrearCertificacion()
  const actualizar = useActualizarCertificacion(certificacion?.id ?? '')

  // `Certificacion` (admin) solo trae `logo_media_id`, no el `Media`
  // resuelto (a diferencia del snapshot público) — se resuelve acá para
  // poder previsualizarlo (imagen o PDF) al editar una certificación ya
  // guardada. Se prioriza `logoSeleccionado` (elegido/subido en esta misma
  // sesión, con su `Media` completo a mano) para no esperar a un refetch.
  const { data: logoExistente } = useMedia(
    certificacion?.logo_media_id ?? undefined,
  )
  const [logoSeleccionado, setLogoSeleccionado] = useState<Media | null>(null)
  const logoParaPrevisualizar = logoSeleccionado ?? logoExistente ?? null

  const form = useForm<CertificacionFormValues>({
    resolver: zodResolver(certificacionSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Depende de `open` (no solo de `certificacion`): sin esto, cerrar el
  // modal sin guardar y reabrirlo en el mismo estado (misma referencia
  // `certificacion`, incluido `null`→`null` en modo "nuevo") no dispara el
  // reset y quedan valores sucios de la sesión anterior.
  useEffect(() => {
    if (!open) return
    form.reset(
      certificacion
        ? {
            nombre: certificacion.nombre,
            institucion: certificacion.institucion,
            fecha_emision: certificacion.fecha_emision.slice(0, 10),
            fecha_expiracion: certificacion.fecha_expiracion
              ? certificacion.fecha_expiracion.slice(0, 10)
              : '',
            url_verificacion: certificacion.url_verificacion,
            credencial_id: certificacion.credencial_id ?? '',
            logo_media_id: certificacion.logo_media_id ?? undefined,
            orden: certificacion.orden,
          }
        : DEFAULT_VALUES,
    )
    // Descarta cualquier selección local de una certificación anterior: el
    // mismo diálogo se reutiliza al editar certificaciones distintas.
    // `logoExistente` se resuelve solo con el `logo_media_id` fresco de arriba.
    setLogoSeleccionado(null)
  }, [open, certificacion, form])

  // UC-XX (Fase 4.1, punto 1): evita cerrar el modal sin avisar (click
  // afuera/Esc) cuando hay cambios sin guardar en el form.
  const { intentarCerrar, confirmando, confirmar, cancelar } =
    useConfirmarDescarte(form.formState.isDirty, onOpenChange)

  const mutacionActiva = esNuevo ? crear : actualizar

  const onSubmit = (values: CertificacionFormValues) => {
    const payload = {
      nombre: values.nombre,
      institucion: values.institucion,
      fecha_emision: values.fecha_emision,
      fecha_expiracion: values.fecha_expiracion || undefined,
      url_verificacion: values.url_verificacion,
      credencial_id: values.credencial_id || undefined,
      logo_media_id: values.logo_media_id || undefined,
      orden: values.orden,
    }

    if (esNuevo) {
      crear.mutate(payload, { onSuccess: () => onOpenChange(false) })
    } else {
      actualizar.mutate(payload, { onSuccess: () => onOpenChange(false) })
    }
  }

  const errorMessage =
    mutacionActiva.error instanceof ApiError
      ? mutacionActiva.error.message
      : mutacionActiva.error
        ? 'No se pudo guardar la certificación. Intenta de nuevo.'
        : null

  return (
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
          <DialogHeader>
            <DialogTitle>
              {esNuevo ? 'Nueva certificación' : 'Editar certificación'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="grid gap-4"
            >
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="institucion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institución</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_emision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de emisión</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="date" max={hoy} {...field} />
                        </FormControl>
                        <CampoFechaConCalendario
                          value={field.value}
                          onChange={field.onChange}
                          max={hoy}
                          triggerAriaLabel="Abrir calendario para elegir la emisión"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fecha_expiracion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de expiración (opcional)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="date"
                            min={form.watch('fecha_emision') || undefined}
                            {...field}
                          />
                        </FormControl>
                        <CampoFechaConCalendario
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          min={form.watch('fecha_emision') || undefined}
                          triggerAriaLabel="Abrir calendario para elegir la expiración"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="url_verificacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de verificación</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credencial_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de credencial (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orden"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <MediaField
                label="Logo o documento del certificado (imagen o PDF)"
                tiposPermitidos={['imagen', 'pdf']}
                currentMediaId={form.watch('logo_media_id')}
                currentPreviewUrl={logoParaPrevisualizar?.url}
                currentMediaTipo={logoParaPrevisualizar?.tipo}
                onUploaded={(media) => {
                  form.setValue('logo_media_id', media.id, {
                    shouldDirty: true,
                  })
                  setLogoSeleccionado(media)
                }}
                onClear={() => {
                  form.setValue('logo_media_id', undefined, {
                    shouldDirty: true,
                  })
                  setLogoSeleccionado(null)
                }}
              />

              {errorMessage ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="submit" disabled={mutacionActiva.isPending}>
                  {mutacionActiva.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmando}
        onOpenChange={(siguienteAbierto) => {
          if (!siguienteAbierto) cancelar()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a perder lo que escribiste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelar}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmar}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
