import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfirmarDescarte } from '@/hooks/useConfirmarDescarte'
import { ApiError } from '@/lib/api-client'
import {
  fondoSitioSchema,
  type FondoSitioFormValues,
} from './fondo-sitio-schema'
import { useCrearFondoSitio } from './useFondosSitio'
import type { FondoSitio } from './types'

const DEFAULT_VALUES: FondoSitioFormValues = {
  tipo: 'degradado_animado',
  configuracion: {
    velocidad: 'media',
    opacidad: 0.5,
  },
}

const OPCIONES_TIPO: Array<{ value: FondoSitio['tipo']; label: string }> = [
  { value: 'solido', label: 'Sólido' },
  { value: 'degradado_animado', label: 'Degradado animado' },
  { value: 'aurora_animada', label: 'Aurora animada' },
  { value: 'particulas', label: 'Partículas' },
  { value: 'cuadricula_animada', label: 'Cuadrícula animada' },
  { value: 'ondas', label: 'Ondas' },
  { value: 'malla_difusa', label: 'Malla difusa' },
  { value: 'lineas_diagonales', label: 'Líneas diagonales' },
]

const OPCIONES_VELOCIDAD: Array<{
  value: FondoSitio['configuracion']['velocidad']
  label: string
}> = [
  { value: 'lenta', label: 'Lenta' },
  { value: 'media', label: 'Media' },
  { value: 'rapida', label: 'Rápida' },
]

/** UC-15 (Configurar fondo animado del sitio): formulario de creación de un fondo nuevo (siempre inactivo, ver `CreateFondoSitioDto`). */
export function FondoSitioFormDialog() {
  const [open, setOpen] = useState(false)
  const crear = useCrearFondoSitio()

  const form = useForm<FondoSitioFormValues>({
    resolver: zodResolver(fondoSitioSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const cerrar = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      form.reset(DEFAULT_VALUES)
    }
  }

  // UC-XX (Fase 4.1, punto 1): evita cerrar el modal sin avisar (click
  // afuera/Esc) cuando hay cambios sin guardar en el form.
  const { intentarCerrar, confirmando, confirmar, cancelar } =
    useConfirmarDescarte(form.formState.isDirty, cerrar)

  const onSubmit = (values: FondoSitioFormValues) => {
    crear.mutate(values, {
      onSuccess: () => {
        form.reset(DEFAULT_VALUES)
        setOpen(false)
      },
    })
  }

  const errorMessage =
    crear.error instanceof ApiError
      ? crear.error.message
      : crear.error
        ? 'No se pudo crear el fondo. Intenta de nuevo.'
        : null

  return (
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogTrigger asChild>
          <Button>Nuevo fondo</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina">
          <DialogHeader>
            <DialogTitle>Nuevo fondo</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="grid gap-4"
            >
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de fondo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPCIONES_TIPO.map((opcion) => (
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
                name="configuracion.velocidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Velocidad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPCIONES_VELOCIDAD.map((opcion) => (
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
                name="configuracion.opacidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opacidad (0 a 1)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
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
                <Button type="submit" disabled={crear.isPending}>
                  {crear.isPending ? 'Creando…' : 'Crear fondo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
