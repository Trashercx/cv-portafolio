import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { MediaField } from '@/components/media/MediaField'
import { Badge } from '@/components/ui/badge'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useUploadMedia } from '@/features/media/useUploadMedia'
import { ApiError } from '@/lib/api-client'
import { CamposInsignia, construirPayloadInsignia } from './CamposInsignia'
import { pdfAImagenPng } from './pdf-a-imagen'
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
import { useProveedoresInsignia } from './useProveedoresInsignia'

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
    // Fase 7e: sin expiración detectada, la casilla "No expira" llega marcada.
    no_expira: !vista.fecha_expiracion,
    habilidades: vista.habilidades ?? [],
    url_verificacion: vista.url_verificacion ?? '',
    // Con archivo, la media ya existe en la biblioteca; con enlace, el servidor la descarga al guardar.
    imagen_media_id: vista.imagen_media_id,
    imagen_url_remota: vista.imagen_media_id ? '' : (vista.imagen?.url ?? ''),
  }
}

/** Nombre del archivo sin su extensión (nombre sugerido al importar un PDF, Fase 7e). */
function nombreSinExtension(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  return punto > 0 ? nombre.slice(0, punto) : nombre
}

/**
 * Fase 7e, UC-35: une lo ya detectado por un proveedor de modo `archivo` (DataCamp)
 * con lo que devuelve `importar-archivo`: se conservan proveedor, emisor,
 * `url_verificacion` e `id_externo`, y los avisos de ambos.
 */
function fusionarConBase(base: VistaPreviaInsignia, nueva: VistaPreviaInsignia): VistaPreviaInsignia {
  return {
    ...nueva,
    proveedor: base.proveedor,
    nombre: nueva.nombre || base.nombre,
    emisor: nueva.emisor || base.emisor,
    url_verificacion: nueva.url_verificacion ?? base.url_verificacion,
    id_externo: nueva.id_externo ?? base.id_externo,
    url_origen: nueva.url_origen ?? base.url_origen,
    avisos: [...new Set([...base.avisos, ...nueva.avisos])],
    modo_proveedor: undefined,
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
  // Fase 7e: conversión PDF → PNG en el navegador, vista previa local y PDF original en la biblioteca.
  const [convirtiendo, setConvirtiendo] = useState(false)
  const [urlPreviaPdf, setUrlPreviaPdf] = useState<string | null>(null)
  const [urlPdfOriginal, setUrlPdfOriginal] = useState<string | null>(null)
  const [errorPdf, setErrorPdf] = useState<string | null>(null)

  const importar = useImportarInsignia()
  const importarArchivo = useImportarArchivoInsignia()
  const crear = useCrearInsignia()
  const subirPdf = useUploadMedia()
  const { data: proveedores } = useProveedoresInsignia()

  const form = useForm<InsigniaFormValues>({
    resolver: zodResolver(insigniaSchema),
    defaultValues: INSIGNIA_VALORES_VACIOS,
  })

  const reiniciar = () => {
    setEntrada('')
    setVista(null)
    setUrlImagenManual(null)
    setConvirtiendo(false)
    setUrlPreviaPdf((previa) => {
      if (previa) URL.revokeObjectURL(previa)
      return null
    })
    setUrlPdfOriginal(null)
    setErrorPdf(null)
    form.reset(INSIGNIA_VALORES_VACIOS)
    subirPdf.reset()
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
    importar.mutate(texto, {
      onSuccess: (resultado) => {
        aplicarVista(resultado)
        // Fase 7e: proveedor que no se puede leer desde el servidor (DataCamp) → "Subir archivo"
        // con los campos ya rellenos y los avisos a la vista.
        if (resultado.modo_proveedor === 'archivo') setPestana('archivo')
      },
    })
  }

  const alElegirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return
    // Si venimos de un proveedor de modo `archivo`, se conservan los datos ya detectados.
    const base = vista?.modo_proveedor === 'archivo' ? vista : null
    const combinar = (resultado: VistaPreviaInsignia) =>
      base ? fusionarConBase(base, resultado) : resultado

    const esPdf = archivo.type === 'application/pdf'
    if (!esPdf) {
      importarArchivo.mutate(archivo, { onSuccess: (resultado) => aplicarVista(combinar(resultado)) })
      return
    }

    setErrorPdf(null)
    setConvirtiendo(true)
    try {
      const { blob } = await pdfAImagenPng(archivo)
      const nombreBase = nombreSinExtension(archivo.name)
      const png = new File([blob], `${nombreBase}.png`, { type: 'image/png' })
      setUrlPreviaPdf((previa) => {
        if (previa) URL.revokeObjectURL(previa)
        return URL.createObjectURL(blob)
      })
      setConvirtiendo(false)
      importarArchivo.mutate(png, {
        onSuccess: (resultado) => {
          const unida = combinar(resultado)
          aplicarVista({ ...unida, nombre: unida.nombre || nombreBase })
        },
      })
      // El PDF original queda en la biblioteca y sirve de `url_origen` si no hay otra.
      subirPdf.mutate(
        { file: archivo, carpeta: 'certificaciones' },
        {
          onSuccess: (media) => setUrlPdfOriginal(media.url),
          onError: () => setErrorPdf('No se pudo guardar el PDF original en la biblioteca.'),
        },
      )
    } catch {
      setConvirtiendo(false)
      setErrorPdf('No se pudo convertir el PDF a imagen. Prueba con una captura PNG del certificado.')
    }
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
          url_origen: vista.url_origen ?? urlPdfOriginal ?? undefined,
        }
      : { proveedor: 'manual' as const }
    crear.mutate(construirPayloadInsignia(values, extra), {
      onSuccess: () => onOpenChange(false),
    })
  }

  const mostrarFormulario = pestana === 'manual' || vista !== null
  const urlImagen = vista?.imagen?.url ?? urlPreviaPdf ?? urlImagenManual
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
            {proveedores && proveedores.length > 0 ? (
              <section aria-label="Proveedores reconocidos" className="grid gap-2">
                <h3 className="text-sm font-medium">Proveedores reconocidos</h3>
                <TooltipProvider delayDuration={150}>
                  <ul className="flex flex-wrap gap-2">
                    {proveedores.map((proveedor) => (
                      <li key={proveedor.clave}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" tabIndex={0}>
                              {proveedor.nombre}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{proveedor.ayuda}</TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </TooltipProvider>
              </section>
            ) : null}

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
                <Label htmlFor="archivo-insignia">Archivo PNG, SVG o PDF (hasta 10 MB)</Label>
                <Input
                  id="archivo-insignia"
                  type="file"
                  accept="image/png,image/svg+xml,application/pdf"
                  disabled={importarArchivo.isPending || convirtiendo}
                  onChange={(event) => void alElegirArchivo(event.target.files?.[0])}
                />
                {convirtiendo ? (
                  <p role="status" className="text-sm text-muted-foreground">Convirtiendo…</p>
                ) : null}
                {urlPreviaPdf && !mostrarFormulario ? (
                  <img
                    src={urlPreviaPdf}
                    alt="Vista previa del PDF"
                    className="mx-auto max-h-48 object-contain"
                  />
                ) : null}
                {importarArchivo.isPending ? (
                  <p className="text-sm text-muted-foreground">Procesando archivo…</p>
                ) : null}
                {errorPdf ? (
                  <p role="alert" className="text-sm text-destructive">{errorPdf}</p>
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
