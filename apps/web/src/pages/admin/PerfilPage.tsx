import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { MediaField } from '@/components/media/MediaField'
import { MediaUploadField } from '@/components/media/MediaUploadField'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea'
import { perfilSchema, type PerfilFormValues } from '@/features/perfil/perfil-schema'
import { usePerfil } from '@/features/perfil/usePerfil'
import { useUpsertPerfil } from '@/features/perfil/useUpsertPerfil'

const DEFAULT_VALUES: PerfilFormValues = {
  nombre_completo: '',
  titulo_profesional: '',
  resumen_bio: '',
  imagen_perfil_id: undefined,
  cv_media_id: undefined,
  ubicacion: '',
}

/** UC-02 (Gestionar perfil personal). Fila única: no hay pantalla de listado. */
export function PerfilPage() {
  const { data: perfil, isLoading } = usePerfil()
  const upsertPerfil = useUpsertPerfil()

  const form = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!perfil) return
    form.reset({
      nombre_completo: perfil.nombre_completo,
      titulo_profesional: perfil.titulo_profesional,
      resumen_bio: perfil.resumen_bio,
      imagen_perfil_id: perfil.imagen_perfil_id ?? undefined,
      cv_media_id: perfil.cv_media_id ?? undefined,
      ubicacion: perfil.ubicacion,
    })
  }, [perfil, form])

  const onSubmit = (values: PerfilFormValues) => {
    upsertPerfil.mutate({
      nombre_completo: values.nombre_completo,
      titulo_profesional: values.titulo_profesional,
      resumen_bio: values.resumen_bio,
      imagen_perfil_id: values.imagen_perfil_id || undefined,
      cv_media_id: values.cv_media_id || undefined,
      ubicacion: values.ubicacion,
    })
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando perfil…</p>
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Perfil</CardTitle>
        <CardDescription>
          Esta información alimenta la sección "Sobre mí" del sitio
          publicado.
        </CardDescription>
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
              name="nombre_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="titulo_profesional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título profesional</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resumen_bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumen / bio</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ubicacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <MediaField
              label="Foto de perfil"
              currentMediaId={form.watch('imagen_perfil_id')}
              onUploaded={(media) =>
                form.setValue('imagen_perfil_id', media.id, {
                  shouldDirty: true,
                })
              }
              onClear={() =>
                form.setValue('imagen_perfil_id', undefined, {
                  shouldDirty: true,
                })
              }
            />

            <MediaUploadField
              label="Currículum (PDF)"
              accept="application/pdf"
              tipo="pdf"
              currentMediaId={form.watch('cv_media_id')}
              onUploaded={(media) =>
                form.setValue('cv_media_id', media.id, { shouldDirty: true })
              }
              onClear={() =>
                form.setValue('cv_media_id', undefined, { shouldDirty: true })
              }
            />

            <Button
              type="submit"
              className="w-fit"
              disabled={upsertPerfil.isPending}
            >
              {upsertPerfil.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
