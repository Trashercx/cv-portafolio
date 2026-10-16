import { useState } from 'react'
import { BibliotecaMediaDialog } from '@/components/media/BibliotecaMediaDialog'
import { MediaPreview } from '@/components/media/MediaPreview'
import { MediaUploadField } from '@/components/media/MediaUploadField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ACCEPT_IMAGENES } from '@/features/media/formatos-imagen'
import type { Media } from '@/features/media/types'

/** Tipos de `Media` que un `MediaField` puede aceptar (subida + biblioteca). */
export type MediaTipoPermitido = 'imagen' | 'pdf'

const ACCEPT_POR_TIPO: Record<MediaTipoPermitido, string> = {
  imagen: ACCEPT_IMAGENES,
  pdf: 'application/pdf',
}

type MediaFieldProps = {
  /** Texto descriptivo, compartido por ambas pestañas. */
  label: string
  currentMediaId?: string | null
  currentPreviewUrl?: string | null
  /** `Media.tipo` de `currentMediaId`/`currentPreviewUrl`, si ya se conoce. Por defecto "imagen" (comportamiento histórico). */
  currentMediaTipo?: string | null
  onUploaded: (media: Media) => void
  onClear?: () => void
  disabled?: boolean
  /**
   * Tipos de `Media` aceptados por este campo, tanto al subir como al
   * elegir de la biblioteca. Por defecto solo `"imagen"` — foto de perfil y
   * galería de proyectos deben seguir restringidas a imagen. Certificación
   * (UC-04) agrega `"pdf"`: el feedback externo señala que el certificado
   * debe poder mostrarse como documento verificable, no solo como logo de
   * la institución.
   */
  tiposPermitidos?: MediaTipoPermitido[]
}

/**
 * Campo de archivo con dos formas de completarlo: subir uno nuevo
 * (`MediaUploadField`, con su flujo de confirmación de dos pasos) o elegir
 * uno ya existente en la biblioteca (UC-09, `GET /admin/media?tipo=`) desde
 * una grilla de miniaturas dentro de un diálogo.
 *
 * `tiposPermitidos` (por defecto `["imagen"]`) acota qué puede subirse/
 * elegirse: foto de perfil y galería de proyectos deben seguir restringidas
 * a imagen; el logo/documento de certificación es el único campo que hoy
 * permite además `"pdf"`. Nunca se usa para el CV en PDF del perfil (ese
 * campo usa `MediaUploadField` suelto, sin "elegir de biblioteca").
 */
export function MediaField({
  label,
  currentMediaId,
  currentPreviewUrl,
  currentMediaTipo,
  onUploaded,
  onClear,
  disabled,
  tiposPermitidos = ['imagen'],
}: MediaFieldProps) {
  const accept = tiposPermitidos.map((tipo) => ACCEPT_POR_TIPO[tipo]).join(',')
  // Con un solo tipo permitido se lo declara explícito (comportamiento
  // histórico); con varios, se omite y el backend lo infiere del mimetype
  // real del archivo subido (`MediaService.inferirTipo`).
  const tipoSubida = tiposPermitidos.length === 1 ? tiposPermitidos[0] : undefined

  return (
    <div className="grid gap-2">
      <Tabs defaultValue="subir">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subir" className="whitespace-normal text-center leading-tight">Subir nuevo</TabsTrigger>
          <TabsTrigger value="biblioteca" className="whitespace-normal text-center leading-tight">Elegir de biblioteca</TabsTrigger>
        </TabsList>
        <TabsContent value="subir">
          <MediaUploadField
            label={label}
            accept={accept}
            tipo={tipoSubida}
            currentMediaId={currentMediaId}
            currentPreviewUrl={currentPreviewUrl}
            currentMediaTipo={currentMediaTipo}
            onUploaded={onUploaded}
            onClear={onClear}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value="biblioteca">
          <SelectorBibliotecaMedia
            label={label}
            currentMediaId={currentMediaId}
            currentPreviewUrl={currentPreviewUrl}
            currentMediaTipo={currentMediaTipo}
            tiposPermitidos={tiposPermitidos}
            onSeleccionar={onUploaded}
            onClear={onClear}
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SelectorBibliotecaMedia({
  label,
  currentMediaId,
  currentPreviewUrl,
  currentMediaTipo,
  tiposPermitidos,
  onSeleccionar,
  onClear,
  disabled,
}: {
  label: string
  currentMediaId?: string | null
  currentPreviewUrl?: string | null
  currentMediaTipo?: string | null
  tiposPermitidos: MediaTipoPermitido[]
  onSeleccionar: (media: Media) => void
  onClear?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>

      {currentPreviewUrl ? (
        <MediaPreview
          tipo={currentMediaTipo ?? 'imagen'}
          url={currentPreviewUrl}
          alt=""
        />
      ) : currentMediaId ? (
        <p className="text-sm text-muted-foreground">
          Archivo ya cargado (sin previsualización disponible).
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          Elegir de biblioteca
        </Button>
        {(currentMediaId || currentPreviewUrl) && onClear ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onClear}
          >
            Quitar
          </Button>
        ) : null}
      </div>

      {/* Fase 7k: diálogo compartido con los campos de imagen del editor visual. */}
      <BibliotecaMediaDialog
        open={open}
        onOpenChange={setOpen}
        tiposPermitidos={tiposPermitidos}
        seleccionadoId={currentMediaId}
        onSeleccionar={onSeleccionar}
        // El formulario ya tiene su pestaña "Subir nuevo".
        permitirSubir={false}
        descripcion={
          tiposPermitidos.includes('pdf')
            ? 'Haz clic en un archivo para usarlo.'
            : 'Haz clic en una imagen para usarla.'
        }
      />
    </div>
  )
}
