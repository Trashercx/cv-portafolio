import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type ErrorBoundaryProps = {
  children: ReactNode
  /**
   * Contenido del fallback cuando hay un error. Recibe `reintentar` (que
   * limpia el estado de error y vuelve a montar `children` sin recargar
   * nada más de la página, útil cuando el llamador tiene un mecanismo de
   * remount propio, p. ej. el `editorKey` de `EditorSeccionesPage`) por si
   * el caller prefiere ese flujo en vez del default de recargar la página.
   * Si no se pasa, se usa un fallback genérico con "Recargar" (`window.location.reload()`).
   */
  fallback?: (reintentar: () => void) => ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
  /** Cuántas veces se pulsó "Reintentar" y el error volvió a aparecer (post-Fase 6, UC-07). */
  reintentos: number
}

/**
 * Detecta fallos de carga de chunks diferidos (post-Fase 6, UC-07): despliegue
 * que reemplazó los assets, red caída o CSS que Vite no pudo precargar.
 */
export function esErrorDeChunk(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.startsWith('Unable to preload CSS') ||
    error.message.startsWith('Failed to fetch dynamically imported module')
  )
}

/**
 * Fase 4.1, punto 5: no existía NINGÚN `ErrorBoundary` en toda la app — un
 * error de render en cualquier parte del árbol (p. ej. el crash reportado al
 * asignarle una imagen de fondo al Hero desde el editor) tumbaba React entero
 * y dejaba una pantalla en blanco sin ningún mensaje. React no ofrece una
 * versión con hooks de esto: `componentDidCatch`/`getDerivedStateFromError`
 * solo existen en componentes de clase.
 *
 * Genérico y reusable: se usa una instancia amplia alrededor de `<Routes>`
 * en `App.tsx` (red de seguridad general) y una instancia separada,
 * más acotada, alrededor de `<Puck>` en `EditorSeccionesPage` (para no
 * perder el resto del panel de administración si el lienzo del editor
 * específicamente crashea).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, reintentos: 0 }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary capturó un error de render:', error, errorInfo)
  }

  reintentar = () => {
    this.setState((previo) => ({
      error: null,
      reintentos: previo.reintentos + 1,
    }))
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.reintentar)
      }
      if (esErrorDeChunk(this.state.error)) {
        return (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <div>
              <h2 className="text-lg font-semibold">Algo salió mal</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No se pudo cargar esta pantalla. Puede ser un despliegue en
                curso o un problema de red.
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        )
      }
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div>
            <h2 className="text-lg font-semibold">Algo salió mal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ocurrió un error inesperado. Podés intentar recargar la página.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={this.reintentar}>Reintentar</Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Recargar
            </Button>
          </div>
          {this.state.reintentos > 0 && (
            <a href="/" className="text-sm underline">
              Volver al inicio
            </a>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
