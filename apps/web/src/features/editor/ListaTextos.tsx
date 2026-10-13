import { Plus, Trash2 } from 'lucide-react'

/** Máximo de títulos rotativos del hero (Fase 7, 7.2: 0-6 ítems). */
export const TITULOS_ROTATIVOS_MAX = 6
/** Longitud máxima de cada título rotativo (Fase 7, 7.2: 1-60 caracteres). */
export const TITULO_ROTATIVO_LONGITUD_MAX = 60

type ListaTextosProps = {
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * Lista de textos (`string[]`) editable, para `hero.titulos_rotativos`
 * (Fase 7, 7.2). El campo nativo `array` de Puck solo admite ítems-objeto, y
 * el contrato del API es un `string[]` plano, así que `puck-config.tsx` lo
 * monta como `custom` con este componente: una fila `<input>` por ítem con
 * botón de quitar, y "Agregar título" hasta `TITULOS_ROTATIVOS_MAX`. Al emitir
 * se descartan las cadenas vacías, para no persistir lo que el DTO rechazaría
 * con 400.
 */
export function ListaTextos({ value, onChange }: ListaTextosProps) {
  // Fase 7, UC-12: nunca se emite una cadena vacía/solo espacios al `content`
  // (el DTO la rechazaría con 400). Mientras se escribe, una fila vacía se
  // quita del valor emitido pero el usuario sigue viendo su input local.
  const emitir = (siguiente: string[]) =>
    onChange(siguiente.filter((texto) => texto.trim() !== ''))

  return (
    <div className="grid gap-2">
      {value.map((texto, indice) => (
        <div key={indice} className="flex items-center gap-1">
          <input
            type="text"
            value={texto}
            maxLength={TITULO_ROTATIVO_LONGITUD_MAX}
            aria-label={`Título rotativo ${indice + 1}`}
            className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
            onChange={(event) =>
              emitir(value.map((actual, i) => (i === indice ? event.target.value : actual)))
            }
          />
          <button
            type="button"
            aria-label={`Quitar título rotativo ${indice + 1}`}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent"
            onClick={() => onChange(value.filter((_, i) => i !== indice))}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      {value.length < TITULOS_ROTATIVOS_MAX ? (
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1 rounded-md border border-input px-2 py-1.5 text-sm hover:bg-accent"
          onClick={() => onChange([...value, 'Nuevo título'])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Agregar título
        </button>
      ) : null}
    </div>
  )
}
