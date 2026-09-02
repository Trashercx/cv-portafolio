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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  redSocialSchema,
  type RedSocialFormValues,
} from '@/features/redes-sociales/red-social-schema'
import { usePlataformasRed } from '@/features/redes-sociales/usePlataformasRed'
import {
  useActualizarRedSocial,
  useCrearRedSocial,
  useRedSocial,
} from '@/features/redes-sociales/useRedesSociales'

const DEFAULT_VALUES: RedSocialFormValues = {
  plataforma_id: '',
  url: '',
  orden: 0,
}

/** UC-06 (Gestionar enlaces de redes): crear/editar con el mismo formulario. */
export function RedFormPage() {
  const { id } = useParams<{ id: string }>()
  const esNuevo = !id
  const navigate = useNavigate()

  const { data: red, isLoading } = useRedSocial(id)
  const { data: plataformas, isLoading: cargandoPlataformas } =
    usePlataformasRed()

  const crear = useCrearRedSocial()
  const actualizar = useActualizarRedSocial(id ?? '')

  const form = useForm<RedSocialFormValues>({
    resolver: zodResolver(redSocialSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!red) return
    form.reset({
      plataforma_id: red.plataforma_id,
      url: red.url,
      orden: red.orden,
    })
  }, [red, form])

  const mutacionActiva = esNuevo ? crear : actualizar

  const onSubmit = (values: RedSocialFormValues) => {
    if (esNuevo) {
      crear.mutate(values, { onSuccess: () => navigate('/admin/redes') })
    } else {
      actualizar.mutate(values)
    }
  }

  if (!esNuevo && isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando enlace…</p>
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          {esNuevo ? 'Nuevo enlace de red' : 'Editar enlace de red'}
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
              name="plataforma_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={cargandoPlataformas}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegir plataforma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(plataformas ?? []).map((plataforma) => (
                        <SelectItem key={plataforma.id} value={plataforma.id}>
                          {plataforma.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://... o mailto:..." {...field} />
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
