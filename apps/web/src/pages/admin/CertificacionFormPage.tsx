import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { MediaUploadField } from '@/components/media/MediaUploadField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  certificacionSchema,
  type CertificacionFormValues,
} from '@/features/certificaciones/certificacion-schema'
import {
  useActualizarCertificacion,
  useCertificacion,
  useCrearCertificacion,
} from '@/features/certificaciones/useCertificaciones'
import { ApiError } from '@/lib/api-client'

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

/** UC-04 (Gestionar certificaciones): crear/editar con el mismo formulario. */
export function CertificacionFormPage() {
  const { id } = useParams<{ id: string }>()
  const esNuevo = !id
  const navigate = useNavigate()

  const { data: certificacion, isLoading } = useCertificacion(id)

  const crear = useCrearCertificacion()
  const actualizar = useActualizarCertificacion(id ?? '')

  const form = useForm<CertificacionFormValues>({
    resolver: zodResolver(certificacionSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!certificacion) return
    form.reset({
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
    })
  }, [certificacion, form])

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
      crear.mutate(payload, {
        onSuccess: () => navigate('/admin/certificaciones'),
      })
    } else {
      actualizar.mutate(payload)
    }
  }

  const errorMessage =
    mutacionActiva.error instanceof ApiError
      ? mutacionActiva.error.message
      : mutacionActiva.error
        ? 'No se pudo guardar la certificación. Intenta de nuevo.'
        : null

  if (!esNuevo && isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargando certificación…
      </p>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {esNuevo ? 'Nueva certificación' : 'Editar certificación'}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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

            <MediaUploadField
              label="Logo (opcional)"
              accept="image/*"
              tipo="imagen"
              currentMediaId={form.watch('logo_media_id')}
              onUploaded={(media) =>
                form.setValue('logo_media_id', media.id, {
                  shouldDirty: true,
                })
              }
              onClear={() =>
                form.setValue('logo_media_id', undefined, {
                  shouldDirty: true,
                })
              }
            />

            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-fit"
              disabled={mutacionActiva.isPending}
            >
              {mutacionActiva.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
