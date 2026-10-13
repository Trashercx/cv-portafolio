import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  esHexValido,
  nivelContraste,
  ratioContraste,
  UMBRAL_AA,
  type NivelContraste,
} from '@/lib/contraste'

type IndicadorContrasteProps = {
  color_texto: string
  color_fondo: string
  color_primario: string
}

function InsigniaNivel({ nivel }: { nivel: NivelContraste }) {
  if (nivel === 'insuficiente') {
    return <Badge variant="destructive">Insuficiente</Badge>
  }
  return <Badge variant={nivel === 'AAA' ? 'default' : 'secondary'}>{nivel}</Badge>
}

function FilaContraste({
  etiqueta,
  a,
  b,
}: {
  etiqueta: string
  a: string
  b: string
}) {
  if (!esHexValido(a) || !esHexValido(b)) {
    return (
      <li className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{etiqueta}</span>
        <span>Color incompleto</span>
      </li>
    )
  }
  const ratio = ratioContraste(a, b)
  const nivel = nivelContraste(ratio)
  return (
    <li
      data-nivel={nivel}
      className="flex items-center justify-between gap-2 text-xs"
    >
      <span>{etiqueta}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono tabular-nums">{ratio.toFixed(2)}:1</span>
        <InsigniaNivel nivel={nivel} />
      </span>
    </li>
  )
}

/**
 * Contraste WCAG 2.x del tema en edición (Fase 7, UC-08): texto sobre fondo y
 * primario sobre fondo, con insignia AAA (>= 7), AA (>= 4.5) o insuficiente.
 * Bajo 4.5:1 muestra un aviso visible, pero NO bloquea el guardado: el admin
 * puede querer una paleta de bajo contraste a propósito.
 */
export function IndicadorContraste({
  color_texto,
  color_fondo,
  color_primario,
}: IndicadorContrasteProps) {
  const hayInsuficiente = [
    [color_texto, color_fondo],
    [color_primario, color_fondo],
  ].some(
    ([a, b]) =>
      esHexValido(a) &&
      esHexValido(b) &&
      nivelContraste(ratioContraste(a, b)) === 'insuficiente',
  )

  return (
    <section aria-label="Contraste de la paleta" className="grid gap-2">
      <h4 className="text-xs font-medium text-muted-foreground">
        Contraste (WCAG)
      </h4>
      <ul className="grid gap-1.5">
        <FilaContraste
          etiqueta="Texto sobre fondo"
          a={color_texto}
          b={color_fondo}
        />
        <FilaContraste
          etiqueta="Primario sobre fondo"
          a={color_primario}
          b={color_fondo}
        />
      </ul>
      {hayInsuficiente ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Contraste insuficiente (menos de {UMBRAL_AA}:1): el texto puede ser
            difícil de leer. Puedes guardar igualmente.
          </span>
        </p>
      ) : null}
    </section>
  )
}
