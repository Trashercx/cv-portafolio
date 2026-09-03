import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { GaleriaImagenesProyecto } from './GaleriaImagenesProyecto'
import { proyectoSchema, type ProyectoFormValues } from './proyecto-schema'
import { TecnologiaSelector } from './TecnologiaSelector'
import type { ProyectoBase } from './types'
import {
  useActualizarProyecto,
  useCrearProyecto,
} from './useProyectoMutations'
import { useProyecto } from './useProyectos'

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

type ProyectoFormDialogProps = {
  proyecto?: ProyectoBase | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * UC-03 (Gestionar proyectos): a diferencia de los otros tres diálogos
 * (Redes, Logros, Certificaciones), este NO cierra el modal al crear.
 * `TecnologiaSelector`/`GaleriaImagenesProyecto` necesitan un `proyectoId`
 * real (endpoints propios `POST/DELETE .../tecnologias/:id` y
 * `.../imagenes`) y no pueden existir en modo "nuevo" sin haber guardado
 * antes — así que el primer submit crea el proyecto y deja el modal abierto
 * para que aparezcan esas dos secciones; recién el segundo guardado (edición
 * de los campos propios del proyecto) cierra el modal.
 */
export function ProyectoFormDialog({
  proyecto,
  open,
  onOpenChange,
}: ProyectoFormDialogProps) {
  const [proyectoIdActivo, setProyectoIdActivo] = useState<string | null>(
    proyecto?.id ?? null,
  )

  // Ayuda de UX nativa del navegador (defensa adicional, no reemplaza la
  // validación de Zod): la fecha de inicio no puede ser futura.
  const hoy = new Date().toISOString().slice(0, 10)

  const crear = useCrearProyecto()
  const actualizar = useActualizarProyecto(proyectoIdActivo ?? '')

  const { data: proyectoFresco } = useProyecto(proyectoIdActivo ?? undefined)

  const form = useForm<ProyectoFormValues>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Al abrir el modal, sincroniza el estado local con la prop `proyecto`
  // (edición) o lo resetea a "nuevo" (creación). Cubre tanto el primer
  // render como reaperturas posteriores del mismo diálogo controlado.
  useEffect(() => {
    if (!open) return
    setProyectoIdActivo(proyecto?.id ?? null)
    form.reset(
      proyecto
        ? {
            titulo: proyecto.titulo,
            descripcion: proyecto.descripcion,
            url_demo: proyecto.url_demo ?? '',
            url_repositorio: proyecto.url_repositorio ?? '',
            fecha_inicio: proyecto.fecha_inicio.slice(0, 10),
            fecha_fin: proyecto.fecha_fin ? proyecto.fecha_fin.slice(0, 10) : '',
            estado: proyecto.estado,
            destacado: proyecto.destacado,
            orden: proyecto.orden,
          }
        : DEFAULT_VALUES,
    )
  }, [open, proyecto, form])

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setProyectoIdActivo(null)
      form.reset(DEFAULT_VALUES)
    }
  }

  const esNuevoProyecto = !proyectoIdActivo
  const mutacionActiva = esNuevoProyecto ? crear : actualizar

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

    if (!proyectoIdActivo) {
      // No cierra el modal: recién con el `id` devuelto puede mostrarse
      // el selector de tecnologías y la galería de imágenes.
      crear.mutate(payload, {
        onSuccess: (creado) => setProyectoIdActivo(creado.id),
      })
    } else {
      actualizar.mutate(payload, { onSuccess: () => handleOpenChange(false) })
    }
  }

  const errorMessage =
    mutacionActiva.error instanceof ApiError
      ? mutacionActiva.error.message
      : mutacionActiva.error
        ? 'No se pudo guardar el proyecto. Intenta de nuevo.'
        : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esNuevoProyecto ? 'Nuevo proyecto' : 'Editar proyecto'}
          </DialogTitle>
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
                      <Input type="date" max={hoy} {...field} />
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
                      <Input
                        type="date"
                        min={form.watch('fecha_inicio') || undefined}
                        {...field}
                      />
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

            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {esNuevoProyecto ? 'Cancelar' : 'Cerrar'}
              </Button>
              <Button type="submit" disabled={mutacionActiva.isPending}>
                {esNuevoProyecto
                  ? mutacionActiva.isPending
                    ? 'Creando…'
                    : 'Crear y continuar'
                  : mutacionActiva.isPending
                    ? 'Guardando…'
                    : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {proyectoIdActivo ? (
          <>
            <Separator />
            <TecnologiaSelector
              proyectoId={proyectoIdActivo}
              tecnologiasAsociadas={proyectoFresco?.tecnologias ?? []}
            />
            <Separator />
            <GaleriaImagenesProyecto
              proyectoId={proyectoIdActivo}
              imagenes={proyectoFresco?.imagenes ?? []}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Crea el proyecto para poder agregarle tecnologías e imágenes.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
