import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import {
  logroSchema,
  type LogroFormValues,
} from '@/features/logros/logro-schema'
import {
  useActualizarLogro,
  useCrearLogro,
  useLogro,
} from '@/features/logros/useLogros'

const DEFAULT_VALUES: LogroFormValues = {
  titulo: '',
  descripcion: '',
  fecha: '',
  categoria: '',
  url_referencia: '',
  orden: 0,
}

/** UC-05 (Gestionar logros y reconocimientos): crear/editar con el mismo formulario. */
export function LogroFormPage() {
  const { id } = useParams<{ id: string }>()
  const esNuevo = !id
  const navigate = useNavigate()

  const { data: logro, isLoading } = useLogro(id)

  const crear = useCrearLogro()
  const actualizar = useActualizarLogro(id ?? '')

  const form = useForm<LogroFormValues>({
    resolver: zodResolver(logroSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!logro) return
    form.reset({
      titulo: logro.titulo,
      descripcion: logro.descripcion,
      fecha: logro.fecha.slice(0, 10),
      categoria: logro.categoria,
      url_referencia: logro.url_referencia ?? '',
      orden: logro.orden,
    })
  }, [logro, form])

  const mutacionActiva = esNuevo ? crear : actualizar

  // Reutiliza el mismo schema de Zod que ya valida el campo (nunca duplica
  // el formato de URL): solo se muestra el link si hay contenido Y pasa esa
  // misma validación. Si está vacío o es inválido, `<FormMessage />` ya
  // cubre el caso de error — el link simplemente no aparece.
  const urlReferencia = form.watch('url_referencia')
  const urlReferenciaValida =
    Boolean(urlReferencia) &&
    logroSchema.shape.url_referencia.safeParse(urlReferencia).success

  const onSubmit = (values: LogroFormValues) => {
    const payload = {
      titulo: values.titulo,
      descripcion: values.descripcion,
      fecha: values.fecha,
      categoria: values.categoria,
      url_referencia: values.url_referencia || undefined,
      orden: values.orden,
    }

    if (esNuevo) {
      crear.mutate(payload, { onSuccess: () => navigate('/admin/logros') })
    } else {
      actualizar.mutate(payload)
    }
  }

  if (!esNuevo && isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando logro…</p>
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          {esNuevo ? 'Nuevo logro' : 'Editar logro'}
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
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="url_referencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de referencia (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                  {urlReferenciaValida ? (
                    <a
                      href={urlReferencia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    >
                      Ver enlace ↗
                    </a>
                  ) : null}
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
