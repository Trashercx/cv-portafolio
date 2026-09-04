import { useState } from 'react'

export type UseConfirmarDescarteResultado = {
  /**
   * Pásalo como `onOpenChange` del `Dialog` (en vez del cierre real
   * directo): intercepta cualquier intento de cierre (click afuera, Esc,
   * botón X) y decide si hace falta confirmar antes.
   */
  intentarCerrar: (siguienteAbierto: boolean) => void
  /** `true` mientras se debe mostrar el `AlertDialog` de "¿Descartar cambios?". */
  confirmando: boolean
  /** El admin eligió "Descartar": ejecuta el cierre real y oculta la confirmación. */
  confirmar: () => void
  /** El admin eligió "Cancelar" (seguir editando): solo oculta la confirmación; el diálogo de formulario sigue abierto. */
  cancelar: () => void
}

/**
 * Guard reusable contra la pérdida accidental de cambios sin guardar en los
 * `*FormDialog.tsx` (React Hook Form + `Dialog` de shadcn/ui sobre
 * `radix-ui` `Dialog.Root`, que por defecto cierra sin avisar en click
 * afuera/Esc/botón X sin importar `form.formState.isDirty`).
 *
 * Cada `*FormDialog` sigue siendo dueño del cierre real (la prop
 * `onOpenChange` que recibe de su `*ListPage`, o un `handleOpenChange`
 * propio que además resetea el form — ver `ProyectoFormDialog`) — se pasa
 * acá como `alCerrar` y este hook solo decide CUÁNDO puede invocarse:
 * directo si `isDirty` es `false` o si se está ABRIENDO
 * (`siguienteAbierto === true`, nunca hace falta confirmar para eso), o
 * recién tras una confirmación explícita del admin (`confirmar`) cuando hay
 * cambios sin guardar.
 *
 * No cierra nada por sí mismo ni sabe nada de React Hook Form: cada
 * `*FormDialog` renderiza su propio `AlertDialog` (reutilizando
 * `components/ui/alert-dialog.tsx`) condicionado a `confirmando`, con sus
 * botones "Cancelar"/"Descartar" llamando a `cancelar`/`confirmar`.
 */
export function useConfirmarDescarte(
  isDirty: boolean,
  alCerrar: (siguienteAbierto: boolean) => void,
): UseConfirmarDescarteResultado {
  const [confirmando, setConfirmando] = useState(false)

  const intentarCerrar = (siguienteAbierto: boolean) => {
    if (siguienteAbierto || !isDirty) {
      alCerrar(siguienteAbierto)
      return
    }
    setConfirmando(true)
  }

  const confirmar = () => {
    setConfirmando(false)
    alCerrar(false)
  }

  const cancelar = () => {
    setConfirmando(false)
  }

  return { intentarCerrar, confirmando, confirmar, cancelar }
}
