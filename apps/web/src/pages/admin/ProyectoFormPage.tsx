import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { GaleriaImagenesProyecto } from '@/features/proyectos/GaleriaImagenesProyecto'
import { TecnologiaSelector } from '@/features/proyectos/TecnologiaSelector'
import {
  proyectoSchema,
  type ProyectoFormValues,
} from '@/features/proyectos/proyecto-schema'
import {
  useActualizarProyecto,
  useCrearProyecto,
} from '@/features/proyectos/useProyectoMutations'
import { useProyecto, useProyectos } from '@/features/proyectos/useProyectos'

const DEFAULT_VALUES: ProyectoFormValues = {
  titulo: '',
  descripcion: '',
  url_demo: '',
  url_repositorio: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: '',
  destacado: false,
  orden: 0,
}

/** UC-03 (Gestionar proyectos): crear/editar con el mismo formulario. */
export function ProyectoFormPage() {
  const { id } = useParams<{ id: string }>()
  const esNuevo = !id
  const navigate = useNavigate()

  const { data: proyecto, isLoading } = useProyecto(id)
  const { data: proyectosExistentes } = useProyectos()

  const crear = useCrearProyecto()
  const actualizar = useActualizarProyecto(id ?? '')

  const form = useForm<ProyectoFormValues>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Modo edición: precarga el formulario con el proyecto ya guardado.
  useEffect(() => {
    if (!proyecto) return
    form.reset({
      titulo: proyecto.titulo,
      descripcion: proyecto.descripcion,
      url_demo: proyecto.url_demo ?? '',
      url_repositorio: proyecto.url_repositorio ?? '',
      fecha_inicio: proyecto.fecha_inicio.slice(0, 10),
      fecha_fin: proyecto.fecha_fin ? proyecto.fecha_fin.slice(0, 10) : '',
      estado: proyecto.estado,
      destacado: proyecto.destacado,
      orden: proyecto.orden,
    })
  }, [proyecto, form])

  // Modo creación: sugiere el siguiente `orden` disponible (editable por el admin).
  useEffect(() => {
    if (esNuevo && proyectosExistentes) {
      form.setValue('orden', proyectosExistentes.length)
    }
  }, [esNuevo, proyectosExistentes, form])

  const mutacionActiva = esNuevo ? crear : actualizar

  const onSubmit = (values: ProyectoFormValues) => {
    const payload = {
      titulo: values.titulo,
      descripcion: values.descripcion,
      url_demo: values.url_demo || undefined,
      url_repositorio: values.url_repositorio || undefined,
      fecha_inicio: values.fecha_inicio,
      fecha_fin: values.fecha_fin || undefined,
      estado: values.estado,
      destacado: values.destacado,
      orden: values.orden,
    }

    if (esNuevo) {
      crear.mutate(payload, {
        onSuccess: (creado) =>
          navigate(`/admin/proyectos/${creado.id}`, { replace: true }),
      })
    } else {
      actualizar.mutate(payload)
    }
  }

  if (!esNuevo && isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando proyecto…</p>
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {esNuevo ? 'Nuevo proyecto' : 'Editar proyecto'}
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
              <FormField
                control={form.control}
                name="url_demo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de demo (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url_repositorio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL del repositorio (opcional)</FormLabel>
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
                  name="fecha_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fecha_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de fin (opcional)</FormLabel>
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
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="p. ej. en_progreso" {...field} />
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
              <FormField
                control={form.control}
                name="destacado"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <FormLabel className="mt-0!">Destacado</FormLabel>
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

      {id ? (
        <>
          <Separator />
          <TecnologiaSelector
            proyectoId={id}
            tecnologiasAsociadas={proyecto?.tecnologias ?? []}
          />
          <Separator />
          <GaleriaImagenesProyecto
            proyectoId={id}
            imagenes={proyecto?.imagenes ?? []}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Guarda el proyecto para poder agregarle tecnologías e imágenes.
        </p>
      )}
    </div>
  )
}
