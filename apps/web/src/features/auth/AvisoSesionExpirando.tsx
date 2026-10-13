import { useEffect, useRef } from 'react'
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
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'
import { useRefrescarSesion } from '@/features/auth/useRefrescarSesion'
import { useSesionExpirando } from '@/features/auth/useSesionExpirando'

/** Formatea segundos como `m:ss` (p. ej. 45 -> "0:45"). */
function formatearTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Aviso de expiración de sesión del panel (Fase 4.4, Séptima ronda): cuando
 * queda 1 minuto o menos hasta `admin.expiresAt` (`useSesionExpirando`),
 * interrumpe con un `AlertDialog` (a diferencia de un `Dialog` normal, no se
 * cierra solo con click afuera — fuerza una decisión explícita) que muestra
 * una cuenta regresiva `m:ss`.
 *
 * "Seguir conectado" dispara `POST /auth/refresh`; en éxito el store se
 * actualiza con el nuevo `expiresAt` y el aviso desaparece solo. "Cancelar"
 * cierra la sesión (`POST /auth/logout`) y navega al login, igual que `AdminLayout`.
 * Si la cuenta llega a 0, la sesión se cierra automáticamente y se navega a
 * `/admin/login?sesion=expirada` (el login muestra el motivo) — antes el
 * diálogo se quedaba abierto hasta que una petición devolviera 401.
 *
 * Montado una sola vez en `AdminLayout` (no se remonta entre rutas del
 * panel), junto a `PaletaComandos`.
 */
export function AvisoSesionExpirando() {
  // Fase 6 (UC-01): ambos caminos de cierre llaman a `POST /auth/logout`
  // (borra la cookie httpOnly en el servidor) vía `useCerrarSesion`, que en
  // `onSettled` limpia store + caché y navega al login.
  const cerrarSesion = useCerrarSesion()
  const cerrarPorExpiracion = useCerrarSesion('/admin/login?sesion=expirada')
  const { mostrarAviso, segundosRestantes, sesionExpirada } =
    useSesionExpirando()
  const refrescarSesion = useRefrescarSesion()

  // Una sola vez por expiración: el `ref` evita repetir la mutación mientras
  // `onSettled` todavía no limpió el store (y ante el doble efecto de
  // StrictMode). No se espera la respuesta: la cookie ya venció, el logout
  // es de mejor esfuerzo y `onSettled` navega pase lo que pase.
  const cierreDisparado = useRef(false)
  const { mutate: cerrarPorExpiracionMutate } = cerrarPorExpiracion
  useEffect(() => {
    if (!sesionExpirada || cierreDisparado.current) return
    cierreDisparado.current = true
    cerrarPorExpiracionMutate()
  }, [sesionExpirada, cerrarPorExpiracionMutate])

  const handleSeguirConectado = () => {
    refrescarSesion.mutate()
  }

  const handleCancelar = () => {
    cerrarSesion.mutate()
  }

  return (
    <AlertDialog open={mostrarAviso}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tu sesión está por expirar</AlertDialogTitle>
          <AlertDialogDescription>
            Tu sesión se cerrará automáticamente en{' '}
            <span role="timer" className="font-semibold tabular-nums">
              {formatearTiempo(segundosRestantes)}
            </span>
            . Elige «Seguir conectado» para extenderla o «Cancelar» para
            cerrarla ahora.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelar}>
            Cancelar
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
