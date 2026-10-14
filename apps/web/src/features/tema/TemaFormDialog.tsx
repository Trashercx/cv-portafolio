import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useConfirmarDescarte } from '@/hooks/useConfirmarDescarte'
import { ApiError } from '@/lib/api-client'
import { esHexValido } from '@/lib/contraste'
import { cn } from '@/lib/utils'
import { cargarFuente, FUENTES_TEMA, obtenerFuente } from './fuentes'
import { IndicadorContraste } from './IndicadorContraste'
import { PLANTILLAS_TEMA } from './plantillas-tema'
import { temaSchema, type TemaFormValues } from './tema-schema'
import type { Tema } from './types'
import { useActualizarTema, useCrearTema } from './useTemas'
import { VistaPreviaTema } from './VistaPreviaTema'

const ID_PLANTILLA_PERSONALIZADA = 'personalizado'

const DEFAULT_VALUES: TemaFormValues = {
  nombre: '',
  color_primario: '#2563eb',
  color_secundario: '#7c3aed',
  color_fondo: '#ffffff',
  color_texto: '#0f172a',
  fuente_principal: 'manrope',
  modo: 'claro',
}

const CAMPOS_COLOR: Array<{
  name: 'color_primario' | 'color_secundario' | 'color_fondo' | 'color_texto'
  label: string
}> = [
  { name: 'color_primario', label: 'Color primario' },
  { name: 'color_secundario', label: 'Color secundario' },
  { name: 'color_fondo', label: 'Color de fondo' },
  { name: 'color_texto', label: 'Color de texto' },
]

/**
 * Valores iniciales del formulario en modo edición. Un `fuente_principal`
 * legado ('Poppins', 'Merriweather', ...) se normaliza a su equivalente del
 * catálogo (`FUENTES_LEGADAS`), porque el esquema solo admite el catálogo
 * cerrado: al guardar, el tema queda migrado.
 */
function valoresDeTema(tema: Tema): TemaFormValues {
  return {
    nombre: tema.nombre,
    color_primario: tema.color_primario,
    color_secundario: tema.color_secundario,
    color_fondo: tema.color_fondo,
    color_texto: tema.color_texto,
    fuente_principal:
      obtenerFuente(tema.fuente_principal)?.clave ??
      DEFAULT_VALUES.fuente_principal,
    modo: tema.modo,
  }
}

/** Acepta `#rrggbb` para el `<input type="color">` (no admite `#rgb` ni vacío). */
function colorParaSelector(valor: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : '#000000'
}

/** Escribir "ff0000" o "#ff0000" da lo mismo: se antepone `#` si falta. */
function normalizarHex(entrada: string): string {
  const limpio = entrada.trim()
  return limpio === '' || limpio.startsWith('#') ? limpio : `#${limpio}`
}

/** Pide la descarga de todas las fuentes del catálogo para pintar la muestra de cada una. */
function cargarMuestrasDeFuentes() {
  for (const fuente of FUENTES_TEMA) void cargarFuente(fuente.clave)
}

type TemaFormDialogProps = {
  /** Si se pasa, el diálogo edita ese tema (`PATCH /admin/temas/:id`) en vez de crear uno. */
  tema?: Tema
}

/**
 * UC-08: formulario de tema. Sin `tema` crea uno nuevo (siempre inactivo, ver
 * `CreateTemaDto`); con `tema` lo edita (Fase 7).
 *
 * Fase 7: color pickers con campo hexadecimal editable al lado, vista previa
 * en vivo en claro y oscuro (`VistaPreviaTema`) y contraste WCAG
 * (`IndicadorContraste`, informativo: no bloquea el guardado); selector de
 * fuente con una muestra "Aa Portafolio" en cada fuente (las fuentes
 * variables se descargan al abrir el selector o al elegirlas, ver
 * `fuentes.ts`).
 */
export function TemaFormDialog({ tema }: TemaFormDialogProps = {}) {
  const editando = Boolean(tema)
  const [open, setOpen] = useState(false)
  const [plantillaId, setPlantillaId] = useState(ID_PLANTILLA_PERSONALIZADA)
  const crear = useCrearTema()
  const actualizar = useActualizarTema(tema?.id ?? '')
  const mutacion = editando ? actualizar : crear

  const valoresIniciales = useMemo(
    () => (tema ? valoresDeTema(tema) : DEFAULT_VALUES),
    [tema],
  )

  const form = useForm<TemaFormValues>({
    resolver: zodResolver(temaSchema),
    defaultValues: valoresIniciales,
  })

  // Valores en vivo para la vista previa y el contraste. Un hex a medio
  // escribir no es un color válido: se cae al valor inicial de ese campo para
  // que la vista previa no se rompa (`derivarPaletaInversa` asume hex válido).
  const vivo = form.watch()
  const temaEnVivo = {
    color_primario: esHexValido(vivo.color_primario)
      ? vivo.color_primario
      : valoresIniciales.color_primario,
    color_secundario: esHexValido(vivo.color_secundario)
      ? vivo.color_secundario
      : valoresIniciales.color_secundario,
    color_fondo: esHexValido(vivo.color_fondo)
      ? vivo.color_fondo
      : valoresIniciales.color_fondo,
    color_texto: esHexValido(vivo.color_texto)
      ? vivo.color_texto
      : valoresIniciales.color_texto,
    fuente_principal: vivo.fuente_principal,
    // Octava ronda (UC-08): el modo del formulario es el modo base; cada
    // vista previa muestra lo que vería el visitante en su modo.
    modo: vivo.modo,
  }

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

  const cambiarAbierto = (nextOpen: boolean) => {
    setOpen(nextOpen)
    // Al abrir y al cerrar se vuelve a los valores de partida: en edición, los
    // del tema tal como está ahora (puede haberse refrescado desde el servidor).
    form.reset(valoresIniciales)
    setPlantillaId(ID_PLANTILLA_PERSONALIZADA)
  }

  // UC-XX (Fase 4.1, punto 1): evita cerrar el modal sin avisar (click
  // afuera/Esc) cuando hay cambios sin guardar en el form.
  const { intentarCerrar, confirmando, confirmar, cancelar } =
    useConfirmarDescarte(form.formState.isDirty, cambiarAbierto)

  const onSubmit = (values: TemaFormValues) => {
    const alTerminar = {
      onSuccess: () => {
        form.reset(editando ? values : DEFAULT_VALUES)
        setPlantillaId(ID_PLANTILLA_PERSONALIZADA)
        setOpen(false)
      },
    }
    if (editando) actualizar.mutate(values, alTerminar)
    else crear.mutate(values, alTerminar)
  }

  const errorMessage =
    mutacion.error instanceof ApiError
      ? mutacion.error.message
      : mutacion.error
        ? editando
          ? 'No se pudo guardar el tema. Intenta de nuevo.'
          : 'No se pudo crear el tema. Intenta de nuevo.'
        : null

  const fuenteSeleccionada = obtenerFuente(vivo.fuente_principal)

  return (
    <>
      <Dialog open={open} onOpenChange={intentarCerrar}>
        <DialogTrigger asChild>
          {editando ? (
            <Button variant="outline" size="sm">
              Editar
            </Button>
          ) : (
            <Button>Nuevo tema</Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar tema' : 'Nuevo tema'}</DialogTitle>
          </DialogHeader>

          {!editando ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="plantilla-tema">
                  Plantilla predefinida (opcional)
                </Label>
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
                  Precarga los campos de abajo con una paleta lista; puedes
                  seguir editándolos antes de crear el tema.
                </p>
              </div>
              <Separator />
            </>
          ) : null}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="grid gap-4"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid content-start gap-4">
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

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                    {CAMPOS_COLOR.map(({ name, label }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                aria-label={`${label} (selector)`}
                                className="h-9 w-11 shrink-0 p-1"
                                value={colorParaSelector(field.value)}
                                onChange={(event) =>
                                  field.onChange(event.target.value)
                                }
                              />
                              <FormControl>
                                <Input
                                  {...field}
                                  maxLength={7}
                                  spellCheck={false}
                                  autoComplete="off"
                                  className={cn(
                                    'font-mono uppercase',
                                    !esHexValido(field.value) &&
                                      'border-destructive',
                                  )}
                                  onChange={(event) =>
                                    field.onChange(normalizarHex(event.target.value))
                                  }
                                />
                              </FormControl>
                            </div>
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
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          onOpenChange={(abierto) => {
                            if (abierto) cargarMuestrasDeFuentes()
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {fuenteSeleccionada ? (
                                  <span className="flex items-baseline gap-2">
                                    <span>{fuenteSeleccionada.nombre}</span>
                                    <span
                                      aria-hidden="true"
                                      className="text-muted-foreground"
                                      style={{
                                        fontFamily: fuenteSeleccionada.familiaCss,
                                      }}
                                    >
                                      Aa Portafolio
                                    </span>
                                  </span>
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FUENTES_TEMA.map((fuente) => (
                              <SelectItem key={fuente.clave} value={fuente.clave}>
                                <span className="flex items-baseline gap-3">
                                  <span>{fuente.nombre}</span>
                                  <span
                                    aria-hidden="true"
                                    className="text-base text-muted-foreground"
                                    style={{ fontFamily: fuente.familiaCss }}
                                  >
                                    Aa Portafolio
                                  </span>
                                </span>
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
                </div>

                <div className="grid content-start gap-3">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    Vista previa en vivo
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                    <VistaPreviaTema tema={temaEnVivo} modo="claro" />
                    <VistaPreviaTema tema={temaEnVivo} modo="oscuro" />
                  </div>
                  <IndicadorContraste
                    color_texto={vivo.color_texto}
                    color_fondo={vivo.color_fondo}
                    color_primario={vivo.color_primario}
                  />
                </div>
              </div>

              {errorMessage ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="submit" disabled={mutacion.isPending}>
                  {editando
                    ? mutacion.isPending
                      ? 'Guardando…'
                      : 'Guardar tema'
                    : mutacion.isPending
                      ? 'Creando…'
                      : 'Crear tema'}
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
