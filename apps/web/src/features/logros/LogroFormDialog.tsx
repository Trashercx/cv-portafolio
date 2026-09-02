import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { logroSchema, type LogroFormValues } from './logro-schema'
import type { Logro } from './types'
import { useActualizarLogro, useCrearLogro } from './useLogros'

const DEFAULT_VALUES: LogroFormValues = {
  titulo: '',
  descripcion: '',
  fecha: '',
  categoria: '',
  url_referencia: '',
  orden: 0,
}

type LogroFormDialogProps = {
  logro?: Logro | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** UC-05 (Gestionar logros y reconocimientos): crear/editar dentro de un modal. */
export function LogroFormDialog({
  logro,
  open,
  onOpenChange,
}: LogroFormDialogProps) {
  const esNuevo = !logro

  const crear = useCrearLogro()
  const actualizar = useActualizarLogro(logro?.id ?? '')

  const form = useForm<LogroFormValues>({
    resolver: zodResolver(logroSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Depende de `open` (no solo de `logro`): sin esto, cerrar el modal sin
  // guardar y reabrirlo en el mismo estado (misma referencia `logro`,
  // incluido `null`→`null` en modo "nuevo") no dispara el reset y quedan
  // valores sucios de la sesión anterior.
  useEffect(() => {
    if (!open) return
    form.reset(
      logro
        ? {
            titulo: logro.titulo,
            descripcion: logro.descripcion,
            fecha: logro.fecha.slice(0, 10),
            categoria: logro.categoria,
            url_referencia: logro.url_referencia ?? '',
            orden: logro.orden,
          }
        : DEFAULT_VALUES,
    )
  }, [open, logro, form])

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
      crear.mutate(payload, { onSuccess: () => onOpenChange(false) })
    } else {
      actualizar.mutate(payload, { onSuccess: () => onOpenChange(false) })
    }
  }

  const errorMessage =
    mutacionActiva.error instanceof ApiError
      ? mutacionActiva.error.message
      : mutacionActiva.error
        ? 'No se pudo guardar el logro. Intenta de nuevo.'
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{esNuevo ? 'Nuevo logro' : 'Editar logro'}</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}
