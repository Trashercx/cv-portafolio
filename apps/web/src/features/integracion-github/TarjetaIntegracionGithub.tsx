import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api-client'
import {
  integracionGithubSchema,
  type IntegracionGithubFormValues,
} from './integracion-github-schema'
import type { IntegracionGithub } from './types'
import {
  useGuardarIntegracionGithub,
  useIntegracionGithub,
  useSincronizarGithub,
} from './useIntegracionGithub'

const DEFAULT_VALUES: IntegracionGithubFormValues = {
  usuario_github: '',
  activa: true,
  intervalo_horas: 6,
  publicar_automaticamente: false,
  incluir_forks: false,
  incluir_archivados: false,
  destacar_nuevos: false,
}

function valoresDe(integracion: IntegracionGithub | null | undefined): IntegracionGithubFormValues {
  if (!integracion) return DEFAULT_VALUES
  return {
    usuario_github: integracion.usuario_github,
    activa: integracion.activa,
    intervalo_horas: integracion.intervalo_horas,
    publicar_automaticamente: integracion.publicar_automaticamente,
    incluir_forks: integracion.incluir_forks,
    incluir_archivados: integracion.incluir_archivados,
    destacar_nuevos: integracion.destacar_nuevos,
  }
}

function formatearMomento(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

type OpcionSwitch = {
  name: 'activa' | 'publicar_automaticamente' | 'incluir_forks' | 'incluir_archivados' | 'destacar_nuevos'
  label: string
  ayuda: string
}

const OPCIONES: OpcionSwitch[] = [
  { name: 'activa', label: 'Sincronización activa', ayuda: 'Si la apagas, solo se sincroniza a mano.' },
  {
    name: 'publicar_automaticamente',
    label: 'Publicar automáticamente',
    ayuda:
      'Publica una versión nueva del sitio al terminar una sincronización con cambios. Ojo: publica TODO lo guardado en el panel (secciones, tema, textos), no solo los proyectos.',
  },
  { name: 'incluir_forks', label: 'Incluir forks', ayuda: 'Importa también los repositorios que son forks.' },
  { name: 'incluir_archivados', label: 'Incluir archivados', ayuda: 'Importa también los repositorios archivados.' },
  { name: 'destacar_nuevos', label: 'Destacar los nuevos', ayuda: 'Los proyectos recién importados nacen como destacados.' },
]

/**
 * UC-36 (Fase 7l): tarjeta "GitHub" de `/admin/proyectos`. Guarda la
 * configuración de la integración (`PUT`), permite sincronizar a demanda y
 * muestra el resumen del resultado, la última sincronización y el último
 * error. Solo se importan repositorios públicos.
 */
export function TarjetaIntegracionGithub() {
  const { data: integracion, isLoading, error } = useIntegracionGithub()
  const guardar = useGuardarIntegracionGithub()
  const sincronizar = useSincronizarGithub()

  const form = useForm<IntegracionGithubFormValues>({
    resolver: zodResolver(integracionGithubSchema),
    defaultValues: DEFAULT_VALUES,
  })

  // `undefined` = aún cargando; `null` = sin configurar (valores por defecto).
  useEffect(() => {
    if (integracion === undefined) return
    form.reset(valoresDe(integracion))
  }, [integracion, form])

  const onSubmit = (values: IntegracionGithubFormValues) => {
    guardar.mutate({ ...values, usuario_github: values.usuario_github.trim() })
  }

  const resultado = sincronizar.data
  const errorSincronizar =
    sincronizar.error instanceof ApiError
      ? sincronizar.error.message
      : sincronizar.error
        ? 'No se pudo sincronizar con GitHub. Intenta de nuevo.'
        : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub</CardTitle>
        <CardDescription>
          Importa tus repositorios públicos como proyectos, con enlace al repositorio. Los
          repositorios privados nunca se importan. Un repositorio nuevo aparece en el sitio al
          publicar una versión, o de inmediato si activas «Publicar automáticamente».
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando integración…</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error instanceof ApiError
              ? error.message
              : 'No se pudo cargar la integración con GitHub.'}
          </p>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="usuario_github"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario de GitHub</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="tu-usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="intervalo_horas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo de sincronización (horas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {OPCIONES.map((opcion) => (
                <FormField
                  key={opcion.name}
                  control={form.control}
                  name={opcion.name}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label={opcion.label}
                        />
                      </FormControl>
                      <div className="grid gap-0.5">
                        <FormLabel className="mt-0!">{opcion.label}</FormLabel>
                        <FormDescription>{opcion.ayuda}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {guardar.error ? (
              <p role="alert" className="text-sm text-destructive">
                {guardar.error instanceof ApiError
                  ? guardar.error.message
                  : 'No se pudo guardar la integración con GitHub.'}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                // Sincronizar usa lo ya guardado: hace falta guardar antes.
                disabled={!integracion || form.formState.isDirty || sincronizar.isPending}
                onClick={() => sincronizar.mutate()}
              >
                {sincronizar.isPending ? 'Sincronizando…' : 'Sincronizar ahora'}
              </Button>
              {integracion && form.formState.isDirty ? (
                <span className="text-xs text-muted-foreground">Guarda los cambios para sincronizar.</span>
              ) : null}
            </div>
          </form>
        </Form>

        {integracion ? (
          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">
              Última sincronización:{' '}
              {integracion.ultima_sincronizacion_en
                ? formatearMomento(integracion.ultima_sincronizacion_en)
                : 'nunca'}
            </p>
            {integracion.ultimo_error ? (
              <p role="alert" className="text-destructive">
                Último error: {integracion.ultimo_error}
              </p>
            ) : null}
          </div>
        ) : null}

        {errorSincronizar ? (
          <p role="alert" className="text-sm text-destructive">
            {errorSincronizar}
          </p>
        ) : null}
        {resultado ? (
          <div role="status" className="grid gap-1 rounded-md bg-muted px-3 py-2 text-sm">
            <p>
              Sincronización terminada: {resultado.creados} creados, {resultado.actualizados}{' '}
              actualizados, {resultado.omitidos} omitidos.
            </p>
            {resultado.publicado ? <p>Se publicó una versión nueva del sitio.</p> : null}
            {resultado.errores.length > 0 ? (
              <ul className="list-disc pl-5 text-destructive">
                {resultado.errores.map((mensaje) => (
                  <li key={mensaje}>{mensaje}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
