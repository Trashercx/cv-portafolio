import { useConfirmarDescarte } from '@/hooks/useConfirmarDescarte'

export type UseCierreConCambiosResultado = {
  /** `true` mientras se debe mostrar `DescartarCambiosDialog` ("¿Descartar cambios?"). */
  abiertoConfirmacion: boolean
  /**
   * Pásalo como `onOpenChange` del `Dialog` del formulario (y como `onClick`
   * de su botón "Cancelar" con `intentarCerrar(false)`): si hay cambios sin
   * guardar pide confirmación; si no, cierra directo.
   */
  intentarCerrar: (siguienteAbierto: boolean) => void
  /** El admin eligió "Descartar": ejecuta el cierre real y oculta la confirmación. */
  confirmarDescartar: () => void
  /** El admin eligió seguir editando: solo oculta la confirmación. */
  cancelar: () => void
}

/**
 * Fase 7m (#68), UC-02…UC-06, UC-19, UC-35: cierre de un formulario en modal
 * sin perder cambios por accidente. Es el contrato común de TODOS los
 * `*FormDialog` del panel (certificaciones, experiencias, insignias, logros,
 * proyectos, redes, skills y tema). Envuelve a `useConfirmarDescarte`
 * (`hooks/`), que también usa la guardia de navegación del editor, con los
 * nombres que usan los formularios.
 *
 * @param isDirty `form.formState.isDirty` del formulario.
 * @param onOpenChange cierre real (la prop del `*ListPage` o un manejador
 *   propio que además resetea el formulario).
 */
export function useCierreConCambios(
  isDirty: boolean,
  onOpenChange: (open: boolean) => void,
): UseCierreConCambiosResultado {
  const { intentarCerrar, confirmando, confirmar, cancelar } = useConfirmarDescarte(
    isDirty,
    onOpenChange,
  )
  return {
    abiertoConfirmacion: confirmando,
    intentarCerrar,
    confirmarDescartar: confirmar,
    cancelar,
  }
}
