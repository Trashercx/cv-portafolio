import { useNavigate } from 'react-router-dom'
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
import { useRefrescarSesion } from '@/features/auth/useRefrescarSesion'
import { useSesionExpirando } from '@/features/auth/useSesionExpirando'
import { useAuthStore } from '@/store/auth-store'

/**
 * Aviso de expiración de sesión del panel (Fase 4.4): cuando quedan 30s o
 * menos hasta `admin.expiresAt` (`useSesionExpirando`), interrumpe con un
 * `AlertDialog` (a diferencia de un `Dialog` normal, no se cierra solo con
 * click afuera — fuerza una decisión explícita).
 *
 * "Seguir conectado" dispara `POST /auth/refresh`; en éxito el store se
 * actualiza con el nuevo `expiresAt` y el aviso desaparece solo (vuelve a
 * quedar a más de 30s del vencimiento). "Cerrar sesión" limpia el store y
 * navega al login, igual que el botón de logout de `AdminLayout`.
 *
 * Montado una sola vez en `AdminLayout` (no se remonta entre rutas del
 * panel), junto a `PaletaComandos`.
 */
export function AvisoSesionExpirando() {
  const navigate = useNavigate()
  const clearAdmin = useAuthStore((state) => state.clearAdmin)
  const { mostrarAviso } = useSesionExpirando()
  const refrescarSesion = useRefrescarSesion()

  const handleSeguirConectado = () => {
    refrescarSesion.mutate()
  }

  const handleCerrarSesion = () => {
    clearAdmin()
    navigate('/admin/login', { replace: true })
  }

  return (
    <AlertDialog open={mostrarAviso}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tu sesión está por expirar</AlertDialogTitle>
          <AlertDialogDescription>
            Por seguridad, tu sesión está a punto de cerrarse por tiempo.
            Elige "Seguir conectado" para continuar, o "Cerrar sesión" para
            salir ahora.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCerrarSesion}>
            Cerrar sesión
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSeguirConectado}
            disabled={refrescarSesion.isPending}
          >
            {refrescarSesion.isPending ? 'Renovando…' : 'Seguir conectado'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
