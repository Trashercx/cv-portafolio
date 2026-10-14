import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MediaField } from '@/components/media/MediaField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import { CamposInsignia, construirPayloadInsignia } from './CamposInsignia'
import {
  INSIGNIA_VALORES_VACIOS,
  insigniaSchema,
  type InsigniaFormValues,
} from './schemas'
import type { VistaPreviaInsignia } from './types'
import {
  useCrearInsignia,
  useImportarArchivoInsignia,
  useImportarInsignia,
} from './useInsignias'

type Pestana = 'enlace' | 'archivo' | 'manual'

type ImportarInsigniaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Convierte la vista previa del API en valores del formulario (fechas a `AAAA-MM-DD`). */
function valoresDesdeVista(vista: VistaPreviaInsignia): InsigniaFormValues {
  return {
    nombre: vista.nombre ?? '',
    emisor: vista.emisor ?? '',
    descripcion: vista.descripcion ?? '',
    fecha_emision: vista.fecha_emision?.slice(0, 10) ?? '',
    fecha_expiracion: vista.fecha_expiracion?.slice(0, 10) ?? '',
    habilidades: vista.habilidades ?? [],
    url_verificacion: vista.url_verificacion ?? '',
    // Con archivo, la media ya existe en la biblioteca; con enlace, el servidor la descarga al guardar.
    imagen_media_id: vista.imagen_media_id,
    imagen_url_remota: vista.imagen_media_id ? '' : (vista.imagen?.url ?? ''),
  }
}

/**
 * Fase 7d, UC-35: diálogo "Importar insignia". Tres vías: pegar un enlace,
 * código de embed o URL de imagen ("Analizar" devuelve una vista previa sin
 * persistir); subir un PNG/SVG (con Open Badges horneado si lo trae); o alta
 * manual con la biblioteca de medios. La vista previa es editable y "Guardar"
 * crea la insignia (`imagen_url_remota` o `imagen_media_id`).
 */
export function ImportarInsigniaDialog({ open, onOpenChange }: ImportarInsigniaDialogProps) {
  const [pestana, setPestana] = useState<Pestana>('enlace')
  const [entrada, setEntrada] = useState('')
  const [vista, setVista] = useState<VistaPreviaInsignia | null>(null)
  const [urlImagenManual, setUrlImagenManual] = useState<string | null>(null)

  const importar = useImportarInsignia()
  const importarArchivo = useImportarArchivoInsignia()
  const crear = useCrearInsignia()

  const form = useForm<InsigniaFormValues>({
    resolver: zodResolver(insigniaSchema),
    defaultValues: INSIGNIA_VALORES_VACIOS,
  })

  const reiniciar = () => {
    setEntrada('')
    setVista(null)
    setUrlImagenManual(null)
    form.reset(INSIGNIA_VALORES_VACIOS)
    importar.reset()
    importarArchivo.reset()
    crear.reset()
  }

  useEffect(() => {
    if (open) {
      setPestana('enlace')
      reiniciar()
    }
    // `reiniciar` solo depende de objetos estables de RHF/TanStack; reinicia al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const aplicarVista = (resultado: VistaPreviaInsignia) => {
    setVista(resultado)
    form.reset(valoresDesdeVista(resultado))
  }

  const analizar = () => {
    const texto = entrada.trim()
    if (!texto) return
    importar.mutate(texto, { onSuccess: aplicarVista })
  }

  const alElegirArchivo = (archivo: File | undefined) => {
    if (!archivo) return
    importarArchivo.mutate(archivo, { onSuccess: aplicarVista })
  }

  const cambiarPestana = (valor: string) => {
    setPestana(valor as Pestana)
    reiniciar()
  }

  const onSubmit = (values: InsigniaFormValues) => {
    const extra = vista
      ? {
          proveedor: vista.proveedor,
          id_externo: vista.id_externo ?? undefined,
          url_origen: vista.url_origen ?? undefined,
        }
      : { proveedor: 'manual' as const }
    crear.mutate(construirPayloadInsignia(values, extra), {
      onSuccess: () => onOpenChange(false),
    })
  }

  const mostrarFormulario = pestana === 'manual' || vista !== null
  const urlImagen = vista?.imagen?.url ?? urlImagenManual
  const errorAnalisis = importar.error ?? importarArchivo.error
  const mensajeError = (error: unknown, porDefecto: string) =>
    error instanceof ApiError ? error.message : porDefecto

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto scrollbar-fina sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar insignia</DialogTitle>
          <DialogDescription>
            Pega el enlace o el código de embed de tu insignia, sube su archivo o cárgala a mano.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="grid gap-4">
            <Tabs value={pestana} onValueChange={cambiarPestana}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="enlace">Enlace o código</TabsTrigger>
                <TabsTrigger value="archivo">Subir archivo</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
              </TabsList>
              <TabsContent value="enlace" className="grid gap-2">
                <Label htmlFor="entrada-insignia">Enlace, código de embed o URL de imagen</Label>
                <Textarea
                  id="entrada-insignia"
                  rows={3}
                  maxLength={4000}
                  value={entrada}
                  onChange={(event) => setEntrada(event.target.value)}
                  placeholder="https://www.credly.com/badges/..."
                />
                <div>
                  <Button
                    type="button"
                    onClick={analizar}
                    disabled={importar.isPending || entrada.trim() === ''}
                  >
                    {importar.isPending ? 'Analizando…' : 'Analizar'}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="archivo" className="grid gap-2">
                <Label htmlFor="archivo-insignia">Archivo PNG o SVG (hasta 10 MB)</Label>
                <Input
                  id="archivo-insignia"
                  type="file"
                  accept="image/png,image/svg+xml"
                  disabled={importarArchivo.isPending}
                  onChange={(event) => alElegirArchivo(event.target.files?.[0])}
                />
                {importarArchivo.isPending ? (
                  <p className="text-sm text-muted-foreground">Procesando archivo…</p>
                ) : null}
              </TabsContent>
              <TabsContent value="manual" className="grid gap-2">
                <MediaField
                  label="Imagen de la insignia"
                  currentMediaId={form.watch('imagen_media_id')}
                  currentPreviewUrl={urlImagenManual}
                  onUploaded={(media) => {
                    form.setValue('imagen_media_id', media.id, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    setUrlImagenManual(media.url)
                  }}
                  onClear={() => {
                    form.setValue('imagen_media_id', undefined, { shouldDirty: true })
                    setUrlImagenManual(null)
                  }}
                />
              </TabsContent>
            </Tabs>

            {errorAnalisis ? (
              <p role="alert" className="text-sm text-destructive">
                {mensajeError(errorAnalisis, 'No se pudo analizar la entrada. Intenta de nuevo.')}
              </p>
            ) : null}

            {vista && vista.avisos.length > 0 ? (
              <ul
                role="status"
                aria-label="Avisos de la importación"
                className="grid gap-1 rounded-md border border-border bg-muted/40 p-3 text-sm"
              >
                {vista.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            ) : null}

            {mostrarFormulario ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
                  {urlImagen ? (
                    <img
                      src={urlImagen}
                      alt="Vista previa de la insignia"
                      className="mx-auto size-48 object-contain"
                    />
                  ) : null}
                  {form.formState.errors.imagen_media_id ||
                  form.formState.errors.imagen_url_remota ? (
                    <p role="alert" className="text-sm text-destructive">
                      {form.formState.errors.imagen_media_id?.message ??
                        form.formState.errors.imagen_url_remota?.message}
                    </p>
                  ) : null}
                  <CamposInsignia form={form} />
                  {crear.error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {mensajeError(crear.error, 'No se pudo guardar la insignia. Intenta de nuevo.')}
                    </p>
                  ) : null}
                  <DialogFooter>
                    <Button type="submit" disabled={crear.isPending}>
                      {crear.isPending ? 'Guardando…' : 'Guardar'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
