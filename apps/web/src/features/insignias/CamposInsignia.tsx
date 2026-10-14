import { X } from 'lucide-react'
import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { InsigniaFormValues } from './schemas'
import type { InsigniaPayload } from './useInsignias'

/**
 * Fase 7d, UC-35: arma el cuerpo de `POST/PATCH` omitiendo los vacíos; la imagen es una de las dos vías.
 * Fase 7e: con "No expira" marcada, `PATCH` (`edicion`) envía `fecha_expiracion: null` y `POST` la omite.
 */
export function construirPayloadInsignia(
  values: InsigniaFormValues,
  extra: Pick<InsigniaPayload, 'proveedor' | 'id_externo' | 'url_origen'> = {},
  { edicion = false }: { edicion?: boolean } = {},
): InsigniaPayload {
  let fechaExpiracion: string | null | undefined = values.fecha_expiracion || undefined
  if (values.no_expira) fechaExpiracion = edicion ? null : undefined
  const payload: InsigniaPayload = {
    nombre: values.nombre.trim(),
    emisor: values.emisor.trim(),
    descripcion: values.descripcion?.trim() || undefined,
    url_verificacion: values.url_verificacion || undefined,
    fecha_emision: values.fecha_emision || undefined,
    fecha_expiracion: fechaExpiracion,
    habilidades: values.habilidades,
    ...extra,
  }
  if (values.imagen_media_id) payload.imagen_media_id = values.imagen_media_id
  else if (values.imagen_url_remota) payload.imagen_url_remota = values.imagen_url_remota
  return payload
}

/** Chips editables de habilidades: Enter o coma agregan, la X quita. */
function ChipsHabilidades({
  valor,
  onChange,
}: {
  valor: string[]
  onChange: (valor: string[]) => void
}) {
  const [borrador, setBorrador] = useState('')

  const agregar = () => {
    const limpio = borrador.trim()
    if (limpio && !valor.includes(limpio)) onChange([...valor, limpio])
    setBorrador('')
  }

  return (
    <div className="grid gap-2">
      {valor.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Habilidades">
          {valor.map((habilidad) => (
            <li
              key={habilidad}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {habilidad}
              <button
                type="button"
                aria-label={`Quitar ${habilidad}`}
                className="rounded-full hover:text-destructive"
                onClick={() => onChange(valor.filter((item) => item !== habilidad))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={borrador}
          placeholder="Agregar habilidad y pulsar Enter"
          aria-label="Nueva habilidad"
          onChange={(event) => setBorrador(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              agregar()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={agregar}>
          Agregar
        </Button>
      </div>
    </div>
  )
}

/**
 * Campos de texto compartidos por la vista previa editable de la importación,
 * el alta manual y la edición (Fase 7d, UC-35). Debe renderizarse dentro de un
 * `<Form {...form}>`; la imagen la resuelve cada contenedor.
 */
export function CamposInsignia({ form }: { form: UseFormReturn<InsigniaFormValues> }) {
  const noExpira = form.watch('no_expira')
  return (
    <>
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
      <FormField
        control={form.control}
        name="emisor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Emisor</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="descripcion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción (opcional)</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fecha_emision"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de emisión</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fecha_expiracion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de expiración</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ''} disabled={noExpira} />
              </FormControl>
              <FormField
                control={form.control}
                name="no_expira"
                render={({ field: casilla }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={casilla.value}
                        onCheckedChange={(marcada) => {
                          casilla.onChange(marcada === true)
                          if (marcada === true) form.setValue('fecha_expiracion', '')
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">No expira</FormLabel>
                  </FormItem>
                )}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="habilidades"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Habilidades</FormLabel>
            <ChipsHabilidades valor={field.value} onChange={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="url_verificacion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL de verificación</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
