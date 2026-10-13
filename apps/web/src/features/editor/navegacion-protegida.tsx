import { useEffect, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useConfirmarDescarte } from '@/hooks/useConfirmarDescarte'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'

const RUTA_EDITOR = '/admin/editor'

/**
 * Navegación interna protegida contra la pérdida de cambios del editor
 * (Fase 7, UC-08). El router de la app es `BrowserRouter` (no un data
 * router), donde `useBlocker` no está disponible: en su lugar, los puntos de
 * salida del panel (enlaces de `AppSidebar` y rutas de `PaletaComandos`)
 * llaman a `navegar`, que solo navega directo si no hay cambios sin guardar
 * en el editor; si los hay, deja el destino en `destinoPendiente` para que
 * `GuardiaNavegacionEditor` pida confirmación.
 *
 * `interceptarClick` es el equivalente para un `<NavLink>`: cancela la
 * navegación nativa solo cuando hay que confirmar y respeta clics con
 * modificadores (abrir en pestaña nueva).
 */
export function useNavegarProtegido() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navegar = (destino: string) => {
    const { hayCambiosSinGuardar, setDestinoPendiente } =
      useEditorSeccionesStore.getState()
    const saleDelEditor =
      pathname.startsWith(RUTA_EDITOR) && !destino.startsWith(RUTA_EDITOR)
    if (hayCambiosSinGuardar && saleDelEditor) {
      setDestinoPendiente(destino)
      return
    }
    navigate(destino)
  }

  const interceptarClick = (event: MouseEvent, destino: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }
    const { hayCambiosSinGuardar } = useEditorSeccionesStore.getState()
    if (hayCambiosSinGuardar && pathname.startsWith(RUTA_EDITOR)) {
      event.preventDefault()
      navegar(destino)
    }
  }

  return { navegar, interceptarClick }
}

/**
 * Diálogo de confirmación al salir del editor con cambios sin guardar,
 * montado una sola vez en `AdminLayout`. Reutiliza `useConfirmarDescarte`
 * (el mismo guard de los `*FormDialog`): `destinoPendiente` actúa como el
 * intento de cierre y `confirmar` ("Descartar y salir") ejecuta la
 * navegación pendiente tras apagar el flag de cambios.
 */
export function GuardiaNavegacionEditor() {
  const navigate = useNavigate()
  const destinoPendiente = useEditorSeccionesStore((s) => s.destinoPendiente)
  const hayCambios = useEditorSeccionesStore((s) => s.hayCambiosSinGuardar)

  const { intentarCerrar, confirmando, confirmar, cancelar } =
    useConfirmarDescarte(hayCambios, () => {
      const { destinoPendiente: destino, setDestinoPendiente, setHayCambiosSinGuardar } =
        useEditorSeccionesStore.getState()
      setHayCambiosSinGuardar(false)
      setDestinoPendiente(null)
      if (destino) navigate(destino)
    })

  useEffect(() => {
    if (destinoPendiente) intentarCerrar(false)
    // `intentarCerrar` cambia en cada render; solo importa el destino nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinoPendiente])

  const seguirEditando = () => {
    useEditorSeccionesStore.getState().setDestinoPendiente(null)
    cancelar()
  }

  return (
    <AlertDialog open={confirmando} onOpenChange={(abierto) => !abierto && seguirEditando()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir sin guardar los cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Hay cambios en el editor que todavía no guardaste. Si sales ahora,
            se perderán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={seguirEditando}>Seguir editando</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar}>Descartar y salir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
