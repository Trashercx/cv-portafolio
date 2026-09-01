import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type OrderButtonsProps = {
  onSubir: () => void
  onBajar: () => void
  disableSubir?: boolean
  disableBajar?: boolean
  disabled?: boolean
}

/** Botones subir/bajar para reordenamiento manual (UC-03 a UC-06, sin drag-and-drop hasta Sprint 3). */
export function OrderButtons({
  onSubir,
  onBajar,
  disableSubir,
  disableBajar,
  disabled,
}: OrderButtonsProps) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Subir"
        disabled={disabled || disableSubir}
        onClick={onSubir}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Bajar"
        disabled={disabled || disableBajar}
        onClick={onBajar}
      >
        <ChevronDown />
      </Button>
    </div>
  )
}
