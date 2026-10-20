import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { DescartarCambiosDialog } from '@/components/shared/DescartarCambiosDialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCierreConCambios } from '@/features/shared/useCierreConCambios'
import { ApiError } from '@/lib/api-client'
import { CLAVES_ICONO_SKILL, IconoSkill } from './iconos-skill'
import { crearSkillSchema, type SkillFormValues } from './skill-schema'
import type { Skill } from './types'
import { useActualizarSkill, useCrearSkill, useSkills } from './useSkills'

const OTRO_ICONO_VALUE = 'otro'

/**
 * Nombre legible sugerido para cada ícono del catálogo (UC-16): al elegir
 * un ícono preestablecido con el campo "nombre" todavía vacío, se
 * autocompleta con esto — nunca sobreescribe un nombre que el admin ya
 * haya escrito a mano.
 */
const NOMBRES_SUGERIDOS_ICONO_SKILL: Record<
  (typeof CLAVES_ICONO_SKILL)[number],
  string
> = {
  nodejs: 'Node.js',
  java: 'Java',
  aws: 'AWS',
  azure: 'Azure',
  react: 'React',
  postgresql: 'PostgreSQL',
  docker: 'Docker',
  git: 'Git',
}

const DEFAULT_VALUES: SkillFormValues = {
  nombre: '',
  icono: '',
  orden: 0,
  visible: true,
}

type SkillFormDialogProps = {
  skill?: Skill | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** UC-16 (Gestionar catálogo de skills): crear/editar dentro de un modal. */
export function SkillFormDialog({
  skill,
  open,
  onOpenChange,
}: SkillFormDialogProps) {
  const esNuevo = !skill

  const crear = useCrearSkill()
  const actualizar = useActualizarSkill(skill?.id ?? '')

  // Lista fresca para la validación de nombre duplicado "en vivo" (UX
  // anticipada, ver `crearSkillSchema`); el backend igual valida con un 409
  // como red de seguridad ante condiciones de carrera.
  const { data: skillsExistentes } = useSkills()

  const form = useForm<SkillFormValues>({
    // Se reconstruye en cada render a propósito: no hace falta memoizar
    // (el costo de crear el schema es trivial) y así siempre valida contra
    // la lista de skills más reciente.
    resolver: zodResolver(crearSkillSchema(skillsExistentes ?? [], skill?.id)),
    defaultValues: DEFAULT_VALUES,
  })

  // `true` cuando el ícono se edita como texto libre (fuera del catálogo de
  // `CLAVES_ICONO_SKILL`). Vive fuera de react-hook-form a propósito: es
  // solo un interruptor de qué control mostrar (Select vs. Input), nunca un
  // valor que viaje al backend.
  const [modoIconoLibre, setModoIconoLibre] = useState(false)

  // Depende de `open` (no solo de `skill`): sin esto, cerrar el modal sin
  // guardar y reabrirlo en el mismo estado (misma referencia `skill`,
  // incluido `null`→`null` en modo "nuevo") no dispara el reset y quedan
  // valores sucios de la sesión anterior.
  useEffect(() => {
    if (!open) return
    form.reset(
      skill
        ? {
            nombre: skill.nombre,
            icono: skill.icono,
            orden: skill.orden,
            visible: skill.visible,
          }
        : DEFAULT_VALUES,
    )
    const iconoInicial = skill?.icono ?? ''
    setModoIconoLibre(
      Boolean(iconoInicial) &&
        !(CLAVES_ICONO_SKILL as readonly string[]).includes(iconoInicial),
    )
  }, [open, skill, form])

  // UC-XX (Fase 4.1, punto 1): evita cerrar el modal sin avisar (click
  // afuera/Esc) cuando hay cambios sin guardar en el form.
  const { abiertoConfirmacion, intentarCerrar, confirmarDescartar, cancelar } = useCierreConCambios(form.formState.isDirty, onOpenChange)

  const mutacionActiva = esNuevo ? crear : actualizar

  const onSubmit = (values: SkillFormValues) => {
    const payload = {
      nombre: values.nombre,
      icono: values.icono,
      orden: values.orden,
      visible: values.visible,
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
        ? 'No se pudo guardar el skill. Intenta de nuevo.'
        : null

  return (
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
          <DialogHeader>
            <DialogTitle>{esNuevo ? 'Nuevo skill' : 'Editar skill'}</DialogTitle>
          </DialogHeader>
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
                      <Input placeholder="p. ej. Node.js" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícono</FormLabel>
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-card">
                        {field.value ? (
                          <IconoSkill icono={field.value} tamano="sm" />
                        ) : null}
                      </span>
                      {modoIconoLibre ? (
                        <FormControl>
                          <Input
                            placeholder="Clave del ícono, p. ej. kubernetes"
                            {...field}
                          />
                        </FormControl>
                      ) : (
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            if (value === OTRO_ICONO_VALUE) {
                              setModoIconoLibre(true)
                              field.onChange('')
                              return
                            }
                            field.onChange(value)
                            // Autocompleta el nombre a partir del ícono elegido,
                            // pero solo si el admin todavía no escribió nada:
                            // nunca sobreescribe un nombre ya ingresado a mano.
                            if (!form.getValues('nombre').trim()) {
                              const nombreSugerido =
                                NOMBRES_SUGERIDOS_ICONO_SKILL[
                                  value as (typeof CLAVES_ICONO_SKILL)[number]
                                ]
                              if (nombreSugerido) {
                                form.setValue('nombre', nombreSugerido, {
                                  shouldDirty: true,
                                  shouldValidate: form.formState.isSubmitted,
                                })
                              }
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Elegir ícono" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CLAVES_ICONO_SKILL.map((clave) => (
                              <SelectItem key={clave} value={clave}>
                                {clave}
                              </SelectItem>
                            ))}
                            <SelectItem value={OTRO_ICONO_VALUE}>
                              Otro (personalizado)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {modoIconoLibre ? (
                      <button
                        type="button"
                        className="w-fit text-xs text-primary underline underline-offset-4"
                        onClick={() => {
                          setModoIconoLibre(false)
                          field.onChange('')
                        }}
                      >
                        Elegir de la lista
                      </button>
                    ) : null}
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
                name="visible"
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
                    <FormLabel className="mt-0!">Visible</FormLabel>
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
