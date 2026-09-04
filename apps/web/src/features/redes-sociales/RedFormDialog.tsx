import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
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
import { redSocialSchema, type RedSocialFormValues } from './red-social-schema'
import type { RedSocial } from './types'
import { usePlataformasRed } from './usePlataformasRed'
import { useActualizarRedSocial, useCrearRedSocial } from './useRedesSociales'

const DEFAULT_VALUES: RedSocialFormValues = {
  plataforma_id: '',
  url: '',
  orden: 0,
}

type RedFormDialogProps = {
  red?: RedSocial | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** UC-06 (Gestionar enlaces de redes): crear/editar dentro de un modal. */
export function RedFormDialog({ red, open, onOpenChange }: RedFormDialogProps) {
  const esNuevo = !red
  const { data: plataformas, isLoading: cargandoPlataformas } =
    usePlataformasRed()

  const crear = useCrearRedSocial()
  const actualizar = useActualizarRedSocial(red?.id ?? '')

  const form = useForm<RedSocialFormValues>({
    resolver: zodResolver(redSocialSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // Depende de `open` (no solo de `red`): sin esto, cerrar el modal sin
  // guardar y reabrirlo en el mismo estado (misma referencia `red`, incluido
  // `null`→`null` en modo "nuevo") no dispara el reset y quedan valores
  // sucios de la sesión anterior.
  useEffect(() => {
    if (!open) return
    form.reset(
      red
        ? { plataforma_id: red.plataforma_id, url: red.url, orden: red.orden }
        : DEFAULT_VALUES,
    )
  }, [open, red, form])

  // UC-XX (Fase 4.1, punto 1): evita cerrar el modal sin avisar (click
  // afuera/Esc) cuando hay cambios sin guardar en el form.
  const { intentarCerrar, confirmando, confirmar, cancelar } =
    useConfirmarDescarte(form.formState.isDirty, onOpenChange)

  const mutacionActiva = esNuevo ? crear : actualizar

  const onSubmit = (values: RedSocialFormValues) => {
    if (esNuevo) {
      crear.mutate(values, { onSuccess: () => onOpenChange(false) })
    } else {
      actualizar.mutate(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  const errorMessage =
    mutacionActiva.error instanceof ApiError
      ? mutacionActiva.error.message
      : mutacionActiva.error
        ? 'No se pudo guardar el enlace. Intenta de nuevo.'
        : null

  return (
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {esNuevo ? 'Nuevo enlace de red' : 'Editar enlace de red'}
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
