import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/** Formatea un `Date` local a `AAAA-MM-DD` (mismo formato que ya usa el `<Input type="date">` nativo). */
function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Parsea `AAAA-MM-DD` a un `Date` local a medianoche (evita el corrimiento de un día que da `new Date(string)` al interpretarlo como UTC). */
function parsearFechaISO(valor: string): Date | undefined {
  if (!valor) return undefined
  const partes = valor.split('-').map(Number)
  const [anio, mes, dia] = partes
  if (!anio || !mes || !dia) return undefined
  return new Date(anio, mes - 1, dia)
}

type CampoFechaConCalendarioProps = {
  /** Valor actual del campo de RHF, en formato `AAAA-MM-DD` (o `''`). */
  value: string
  onChange: (valor: string) => void
  /** Fecha mínima permitida (`AAAA-MM-DD`), igual que el `min` del input nativo. */
  min?: string
  /** Fecha máxima permitida (`AAAA-MM-DD`), igual que el `max` del input nativo. */
  max?: string
  disabled?: boolean
  triggerAriaLabel: string
}

/**
 * Selector de fecha ADICIONAL (Fase 4.2, punto 1): complementa al
 * `<Input type="date">` nativo que ya existe en cada formulario, nunca lo
 * reemplaza — ambos caminos escriben al mismo campo de React Hook Form, en
 * el mismo formato `AAAA-MM-DD` que ya validan los schemas de Zod.
 */
export function CampoFechaConCalendario({
  value,
  onChange,
  min,
  max,
  disabled,
  triggerAriaLabel,
}: CampoFechaConCalendarioProps) {
  const [abierto, setAbierto] = useState(false)
  const seleccionado = parsearFechaISO(value)

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={triggerAriaLabel}
        >
          <CalendarIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={seleccionado}
          defaultMonth={seleccionado}
          onSelect={(dia) => {
            if (!dia) return
            onChange(formatearFechaISO(dia))
            setAbierto(false)
          }}
          disabled={(dia) => {
            const iso = formatearFechaISO(dia)
            if (min && iso < min) return true
            if (max && iso > max) return true
            return false
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
