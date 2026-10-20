import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MediaField } from '@/components/media/MediaField'
import { CampoFechaConCalendario } from '@/components/shared/CampoFechaConCalendario'
import { DescartarCambiosDialog } from '@/components/shared/DescartarCambiosDialog'
import { SeccionFormulario } from '@/components/shared/SeccionFormulario'
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
import { Textarea } from '@/components/ui/textarea'
import type { Media } from '@/features/media/types'
import { useCierreConCambios } from '@/features/shared/useCierreConCambios'
import { ApiError } from '@/lib/api-client'
import {
  construirPayloadExperiencia,
  experienciaSchema,
  type ExperienciaFormValues,
} from './experiencia-schema'
import { TecnologiasPorNombre } from './TecnologiasPorNombre'
import { MODALIDADES_EXPERIENCIA, type Experiencia } from './types'
import { useActualizarExperiencia, useCrearExperiencia } from './useExperiencias'

const DEFAULT_VALUES: ExperienciaFormValues = {
  empresa: '',
  cargo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  actual: false,
  ubicacion: '',
  modalidad: 'presencial',
  url_empresa: '',
  logo_media_id: null,
  tecnologias: [],
  visible: true,
}

type ExperienciaFormDialogProps = {
  experiencia?: Experiencia | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** UC-19 (Gestionar experiencia laboral): crear/editar un puesto dentro de un modal. */
export function ExperienciaFormDialog({
  experiencia,
  open,
  onOpenChange,
}: ExperienciaFormDialogProps) {
  const esNuevo = !experiencia
  const crear = useCrearExperiencia()
  const actualizar = useActualizarExperiencia()
  const [logoElegido, setLogoElegido] = useState<Media | null>(null)

  const form = useForm<ExperienciaFormValues>({
    resolver: zodResolver(experienciaSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Depende de `open`: reabrir en el mismo estado debe limpiar lo de la sesión anterior.
  useEffect(() => {
    if (!open) return
    setLogoElegido(null)
    form.reset(
      experiencia
        ? {
            empresa: experiencia.empresa,
            cargo: experiencia.cargo,
            descripcion: experiencia.descripcion,
            fecha_inicio: experiencia.fecha_inicio.slice(0, 10),
            fecha_fin: experiencia.fecha_fin ? experiencia.fecha_fin.slice(0, 10) : '',
            actual: experiencia.fecha_fin === null,
            ubicacion: experiencia.ubicacion ?? '',
            modalidad: experiencia.modalidad,
            url_empresa: experiencia.url_empresa ?? '',
            logo_media_id: experiencia.logo_media_id,
            tecnologias: experiencia.tecnologias.map((tecnologia) => tecnologia.nombre),
            visible: experiencia.visible,
          }
        : DEFAULT_VALUES,
    )
  }, [open, experiencia, form])

  const { abiertoConfirmacion, intentarCerrar, confirmarDescartar, cancelar } = useCierreConCambios(
    form.formState.isDirty,
    onOpenChange,
  )

  const mutacionActiva = esNuevo ? crear : actualizar
  const actual = form.watch('actual')
  const logoId = form.watch('logo_media_id')
  const urlLogo = logoElegido?.url ?? (experiencia?.logo?.id === logoId ? experiencia?.logo?.url : undefined)

  const onSubmit = (values: ExperienciaFormValues) => {
    if (experiencia) {
      actualizar.mutate(
        { id: experiencia.id, payload: construirPayloadExperiencia(values) },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      crear.mutate(construirPayloadExperiencia(values), {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  const errorMessage =
    mutacionActiva.error instanceof ApiError
      ? mutacionActiva.error.message
      : mutacionActiva.error
        ? 'No se pudo guardar la experiencia. Intenta de nuevo.'
        : null

  return (
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
          <DialogHeader>
            <DialogTitle>{esNuevo ? 'Nueva experiencia' : 'Editar experiencia'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
                <SeccionFormulario titulo="Puesto">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="empresa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
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
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción (opcional)</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SeccionFormulario>
                <SeccionFormulario titulo="Fechas">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fecha_inicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de inicio</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <CampoFechaConCalendario
                              value={field.value}
                              onChange={field.onChange}
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
                          <FormLabel>Fecha de fin</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                type="date"
                                disabled={actual}
                                min={form.watch('fecha_inicio') || undefined}
                                {...field}
                                value={actual ? '' : (field.value ?? '')}
                              />
                            </FormControl>
                            <CampoFechaConCalendario
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              min={form.watch('fecha_inicio') || undefined}
                              disabled={actual}
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
                    name="actual"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              const marcado = checked === true
                              field.onChange(marcado)
                              // "Actual" anula la fecha de fin (y su error pendiente).
                              if (marcado) {
                                form.setValue('fecha_fin', '', { shouldDirty: true })
                                form.clearErrors('fecha_fin')
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="mt-0!">Actual (sigo en este puesto)</FormLabel>
                      </FormItem>
                    )}
                  />
                </SeccionFormulario>
                <SeccionFormulario titulo="Modalidad y lugar">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="modalidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modalidad</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MODALIDADES_EXPERIENCIA.map((modalidad) => (
                                <SelectItem key={modalidad.valor} value={modalidad.valor}>
                                  {modalidad.etiqueta}
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
                      name="ubicacion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ubicación (opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </SeccionFormulario>
                <SeccionFormulario titulo="Enlaces y tecnologías">
                  <FormField
                    control={form.control}
                    name="url_empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sitio de la empresa (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tecnologias"
                    render={({ field }) => (
                      <FormItem>
                        <TecnologiasPorNombre
                          value={field.value}
                          onChange={(nombres) => field.onChange(nombres)}
                        />
                      </FormItem>
                    )}
                  />
                </SeccionFormulario>
                <SeccionFormulario titulo="Logo">
                  <MediaField
                    label="Logo de la empresa (opcional)"
                    currentMediaId={logoId}
                    currentPreviewUrl={urlLogo}
                    onUploaded={(media) => {
                      form.setValue('logo_media_id', media.id, { shouldDirty: true })
                      setLogoElegido(media)
                    }}
                    onClear={() => {
                      form.setValue('logo_media_id', null, { shouldDirty: true })
                      setLogoElegido(null)
                    }}
                  />
                </SeccionFormulario>
                <FormField
                  control={form.control}
                  name="visible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <FormLabel className="mt-0!">Visible en el sitio</FormLabel>
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
                    disabled={mutacionActiva.isPending}
                    onClick={() => intentarCerrar(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={mutacionActiva.isPending}>
                    {mutacionActiva.isPending ? 'Guardando…' : 'Guardar'}
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
