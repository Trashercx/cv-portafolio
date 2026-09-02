import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ApiError } from '@/lib/api-client'
import { PLANTILLAS_TEMA } from './plantillas-tema'
import { temaSchema, type TemaFormValues } from './tema-schema'
import { useCrearTema } from './useTemas'

const ID_PLANTILLA_PERSONALIZADA = 'personalizado'

const DEFAULT_VALUES: TemaFormValues = {
  nombre: '',
  color_primario: '#2563eb',
  color_secundario: '#7c3aed',
  color_fondo: '#ffffff',
  color_texto: '#0f172a',
  fuente_principal: 'Inter',
  modo: 'claro',
}

const CAMPOS_COLOR: Array<{ name: keyof TemaFormValues; label: string }> = [
  { name: 'color_primario', label: 'Color primario' },
  { name: 'color_secundario', label: 'Color secundario' },
  { name: 'color_fondo', label: 'Color de fondo' },
  { name: 'color_texto', label: 'Color de texto' },
]

/** UC-08: formulario de creación de un tema nuevo (siempre inactivo, ver `CreateTemaDto`). */
export function TemaFormDialog() {
  const [open, setOpen] = useState(false)
  const [plantillaId, setPlantillaId] = useState(ID_PLANTILLA_PERSONALIZADA)
  const crear = useCrearTema()

  const form = useForm<TemaFormValues>({
    resolver: zodResolver(temaSchema),
    defaultValues: DEFAULT_VALUES,
  })

  /**
   * Precarga el formulario con una paleta del catálogo (`PLANTILLAS_TEMA`).
   * Solo rellena valores por defecto editables: no crea nada en el backend,
   * la creación real sigue pasando por `useCrearTema` al enviar el form.
   */
  const aplicarPlantilla = (id: string) => {
    setPlantillaId(id)
    if (id === ID_PLANTILLA_PERSONALIZADA) {
      form.reset(DEFAULT_VALUES)
      return
    }
    const plantilla = PLANTILLAS_TEMA.find((candidata) => candidata.id === id)
    if (!plantilla) return
    form.reset({
      nombre: plantilla.nombre,
      color_primario: plantilla.color_primario,
      color_secundario: plantilla.color_secundario,
      color_fondo: plantilla.color_fondo,
      color_texto: plantilla.color_texto,
      fuente_principal: plantilla.fuente_principal,
      modo: plantilla.modo,
    })
  }

  const onSubmit = (values: TemaFormValues) => {
    crear.mutate(values, {
      onSuccess: () => {
        form.reset(DEFAULT_VALUES)
        setPlantillaId(ID_PLANTILLA_PERSONALIZADA)
        setOpen(false)
      },
    })
  }

  const errorMessage =
    crear.error instanceof ApiError
      ? crear.error.message
      : crear.error
        ? 'No se pudo crear el tema. Intenta de nuevo.'
        : null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          form.reset(DEFAULT_VALUES)
          setPlantillaId(ID_PLANTILLA_PERSONALIZADA)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Nuevo tema</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo tema</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="plantilla-tema">Plantilla predefinida (opcional)</Label>
          <Select value={plantillaId} onValueChange={aplicarPlantilla}>
            <SelectTrigger id="plantilla-tema" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ID_PLANTILLA_PERSONALIZADA}>
                Personalizado (en blanco)
              </SelectItem>
              {PLANTILLAS_TEMA.map((plantilla) => (
                <SelectItem key={plantilla.id} value={plantilla.id}>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full border"
                        style={{ backgroundColor: plantilla.color_primario }}
                      />
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full border"
                        style={{ backgroundColor: plantilla.color_secundario }}
                      />
                    </span>
                    {plantilla.nombre} · {plantilla.modo}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Precarga los campos de abajo con una paleta lista; podés seguir
            editándolos antes de crear el tema.
          </p>
        </div>

        <Separator className="my-2" />

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

            <div className="grid grid-cols-2 gap-4">
              {CAMPOS_COLOR.map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          type="color"
                          className="h-9 w-full p-1"
                          {...field}
                          value={String(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="fuente_principal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipografía principal</FormLabel>
                  <FormControl>
                    <Input placeholder="p. ej. Inter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="claro">Claro</SelectItem>
                      <SelectItem value="oscuro">Oscuro</SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending ? 'Creando…' : 'Crear tema'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
