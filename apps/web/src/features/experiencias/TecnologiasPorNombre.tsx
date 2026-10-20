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
import { useTecnologias } from '@/features/tecnologias/useTecnologias'

type TecnologiasPorNombreProps = {
  value: string[]
  onChange: (nombres: string[]) => void
}

/**
 * Selector de tecnologías de la experiencia (Fase 7l, UC-19). Misma idea que
 * `TecnologiaSelector` de proyectos (elegir del catálogo o escribir una
 * nueva), pero controlado y por NOMBRE: la experiencia envía
 * `tecnologias: string[]` y el API hace el upsert en el catálogo al guardar,
 * así que no hay endpoints por tecnología ni se persiste nada antes de
 * guardar el formulario.
 */
export function TecnologiasPorNombre({ value, onChange }: TecnologiasPorNombreProps) {
  const { data: catalogo } = useTecnologias()
  const [seleccion, setSeleccion] = useState('')
  const [nueva, setNueva] = useState('')

  const yaEsta = (nombre: string) =>
    value.some((actual) => actual.toLowerCase() === nombre.toLowerCase())
  const disponibles = (catalogo ?? []).filter((tecnologia) => !yaEsta(tecnologia.nombre))

  const agregar = (nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio || yaEsta(limpio)) return
    onChange([...value, limpio])
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">Tecnologías</p>
      <div className="flex flex-wrap gap-2">
        {value.map((nombre) => (
          <Badge key={nombre} variant="secondary" className="gap-1">
            {nombre}
            <button
              type="button"
              aria-label={`Quitar ${nombre}`}
              onClick={() => onChange(value.filter((actual) => actual !== nombre))}
            >
              ×
            </button>
          </Badge>
        ))}
        {value.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin tecnologías asociadas.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={seleccion} onValueChange={setSeleccion}>
          <SelectTrigger className="w-56" aria-label="Elegir tecnología existente">
            <SelectValue placeholder="Elegir tecnología existente" />
          </SelectTrigger>
          <SelectContent>
            {disponibles.map((tecnologia) => (
              <SelectItem key={tecnologia.id} value={tecnologia.nombre}>
                {tecnologia.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={!seleccion}
          onClick={() => {
            agregar(seleccion)
            setSeleccion('')
          }}
        >
          Agregar
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Nueva tecnología"
          aria-label="Nueva tecnología"
          value={nueva}
          className="w-56"
          onChange={(event) => setNueva(event.target.value)}
          onKeyDown={(event) => {
            // Enter agrega la tecnología sin enviar el formulario completo.
            if (event.key === 'Enter') {
              event.preventDefault()
              agregar(nueva)
              setNueva('')
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!nueva.trim()}
          onClick={() => {
            agregar(nueva)
            setNueva('')
          }}
        >
          Crear y agregar
        </Button>
      </div>
    </div>
  )
}
