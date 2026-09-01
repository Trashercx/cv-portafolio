import { RenderizadorSecciones } from '@/components/publico/RenderizadorSecciones'
import { useSitio } from '@/features/publico/usePublico'
import { ApiError } from '@/lib/api-client'
import { temaComoVariablesCss } from '@/lib/tema-css'

/**
 * UC-12 (Ver el sitio publicado): trae `GET /sitio` (siempre el snapshot de
 * la última versión publicada, nunca contenido en vivo/borrador) y pinta sus
 * secciones visibles, en orden, con el tema del snapshot aplicado como
 * variables CSS (mismo patrón que `TemaPage`, ver `temaComoVariablesCss`).
 */
export function PublicHomePage() {
  const { data: snapshot, isLoading, error } = useSitio()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <p role="alert" className="text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudo cargar el sitio.'}
        </p>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">
          Este sitio todavía no tiene una versión publicada.
        </p>
      </div>
    )
  }

  return (
    <div
      style={snapshot.tema ? temaComoVariablesCss(snapshot.tema) : undefined}
      className="min-h-svh"
    >
      <RenderizadorSecciones snapshot={snapshot} />
    </div>
  )
}
