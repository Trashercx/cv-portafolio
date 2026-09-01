import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCrearTecnologia, useTecnologias } from '@/features/tecnologias/useTecnologias'
import { ApiError } from '@/lib/api-client'
import {
  useAgregarTecnologiaProyecto,
  useQuitarTecnologiaProyecto,
} from './useProyectoMutations'
import type { ProyectoTecnologia } from './types'

type TecnologiaSelectorProps = {
  proyectoId: string
  tecnologiasAsociadas: ProyectoTecnologia[]
}

/**
 * Selector multi-tecnología de UC-03: elegir una tecnología ya existente del
 * catálogo, o escribir una nueva (se crea o se reutiliza vía
 * `POST /admin/tecnologias`) y asociarla al proyecto.
 */
export function TecnologiaSelector({
  proyectoId,
  tecnologiasAsociadas,
}: TecnologiaSelectorProps) {
  const { data: catalogo } = useTecnologias()
  const crearTecnologia = useCrearTecnologia()
  const agregar = useAgregarTecnologiaProyecto(proyectoId)
  const quitar = useQuitarTecnologiaProyecto(proyectoId)
  const [seleccionCatalogo, setSeleccionCatalogo] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')

  const idsAsociados = new Set(
    tecnologiasAsociadas.map((item) => item.tecnologia_id),
  )
  const disponibles = (catalogo ?? []).filter((t) => !idsAsociados.has(t.id))

  const error = agregar.error ?? quitar.error ?? crearTecnologia.error
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? 'No se pudo actualizar la lista de tecnologías.'
        : null

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">Tecnologías</p>

      <div className="flex flex-wrap gap-2">
        {tecnologiasAsociadas.map((item) => (
          <Badge key={item.tecnologia_id} variant="secondary" className="gap-1">
            {item.tecnologia.nombre}
            <button
              type="button"
              aria-label={`Quitar ${item.tecnologia.nombre}`}
              disabled={quitar.isPending}
              onClick={() => quitar.mutate(item.tecnologia_id)}
            >
              ×
            </button>
          </Badge>
        ))}
        {tecnologiasAsociadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin tecnologías asociadas.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={seleccionCatalogo} onValueChange={setSeleccionCatalogo}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Elegir tecnología existente" />
          </SelectTrigger>
          <SelectContent>
            {disponibles.map((tecnologia) => (
              <SelectItem key={tecnologia.id} value={tecnologia.id}>
                {tecnologia.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={!seleccionCatalogo || agregar.isPending}
          onClick={() => {
            agregar.mutate(seleccionCatalogo, {
              onSuccess: () => setSeleccionCatalogo(''),
            })
          }}
        >
          Agregar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Nueva tecnología"
          value={nuevoNombre}
          onChange={(event) => setNuevoNombre(event.target.value)}
          className="w-56"
        />
        <Button
          type="button"
          variant="outline"
          disabled={
            !nuevoNombre.trim() || crearTecnologia.isPending || agregar.isPending
          }
          onClick={() => {
            crearTecnologia.mutate(nuevoNombre.trim(), {
              onSuccess: (tecnologia) => {
                setNuevoNombre('')
                agregar.mutate(tecnologia.id)
              },
            })
          }}
        >
          Crear y agregar
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
