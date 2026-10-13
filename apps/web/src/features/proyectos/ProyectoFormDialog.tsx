import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { CampoFechaConCalendario } from '@/components/shared/CampoFechaConCalendario'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useConfirmarDescarte } from '@/hooks/useConfirmarDescarte'
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

/** Espeja los 3 valores cerrados de `proyecto-schema.ts`/`CreateProyectoDto.estado` (`@IsIn`). */
const OPCIONES_ESTADO: Array<{ value: ProyectoFormValues['estado']; label: string }> = [
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'pausado', label: 'Pausado' },
]

const VALORES_ESTADO_VALIDOS = new Set<string>(
  OPCIONES_ESTADO.map((opcion) => opcion.value),
)

/**
 * `ProyectoBase.estado` sigue siendo `string` (igual que en el backend,
 * ver `CreateProyectoDto`): un proyecto ya guardado antes de este cambio
 * (Fase 4.2, punto 2) podría, en teoría, tener un valor fuera de los 3
 * cerrados. Fallback conservador (mismo criterio que la foto de hero legada)
 * para no dejar el `Select` en un estado inválido/sin selección.
 */
function normalizarEstadoProyecto(estado: string): ProyectoFormValues['estado'] {
  return VALORES_ESTADO_VALIDOS.has(estado)
    ? (estado as ProyectoFormValues['estado'])
    : 'en_progreso'
}

const DEFAULT_VALUES: ProyectoFormValues = {
  titulo: '',
  descripcion: '',
  url_demo: '',
  url_repositorio: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'en_progreso',
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
            estado: normalizarEstadoProyecto(proyecto.estado),
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

  // Fase 4.1: evita cerrar el modal sin avisar (click afuera/Esc)
  // cuando hay cambios sin guardar en el form. Envuelve
  // `handleOpenChange` (que ya resetea el form/estado local al cerrar) en
  // vez de reemplazarlo: solo se ejecuta tras confirmar el descarte, o de
  // inmediato si no hay cambios sin guardar.
  const { intentarCerrar, confirmando, confirmar, cancelar } =
    useConfirmarDescarte(form.formState.isDirty, handleOpenChange)

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
        onSuccess: (creado) => {
          setProyectoIdActivo(creado.id)
          // Bug reportado por code-reviewer (Fase 4.1): sin este reset, el
          // form queda "sucio" contra su baseline original después de
          // crear el proyecto (React Hook Form no limpia `isDirty` solo por
          // enviar, únicamente con `reset()`). Si el admin cierra el modal
          // (Esc/click afuera/X) sin hacer el segundo guardado, el guard de
          // `useConfirmarDescarte` mostraba "¿Descartar cambios?" aunque el
          // proyecto YA esté persistido — un falso positivo confuso, ya que
          // solo se perdería la carga de tecnologías/imágenes de esta
          // sesión, no los datos del proyecto en sí. `values` es la misma
          // forma (`ProyectoFormValues`) que ya está mostrando el form, así
          // que la nueva baseline coincide con lo guardado sin alterar lo
          // que ve el admin.
          form.reset(values)
        },
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
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {esNuevoProyecto ? 'Nuevo proyecto' : 'Editar proyecto'}
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
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="date" max={hoy} {...field} />
                        </FormControl>
                        <CampoFechaConCalendario
                          value={field.value}
                          onChange={field.onChange}
                          max={hoy}
                          triggerAriaLabel="Abrir calendario para elegir el inicio"
                        />
                      </div>
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
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="date"
                            min={form.watch('fecha_inicio') || undefined}
                            {...field}
                          />
                        </FormControl>
                        <CampoFechaConCalendario
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          min={form.watch('fecha_inicio') || undefined}
                          triggerAriaLabel="Abrir calendario para elegir el fin"
                        />
                      </div>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPCIONES_ESTADO.map((opcion) => (
                          <SelectItem key={opcion.value} value={opcion.value}>
                            {opcion.label}
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
                  onClick={() => intentarCerrar(false)}
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
