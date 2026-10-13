import { Link } from 'react-router-dom'
import { MetadatosPagina } from '@/components/publico/MetadatosPagina'
import { useSitio } from '@/features/publico/usePublico'
import { useModoTema } from '@/hooks/useModoTema'
import { temaComoVariablesCss } from '@/lib/tema-css'
import { cn } from '@/lib/utils'

/**
 * 404 del sitio público (Fase 6, UC-12): reemplaza el antiguo redirect a `/`.
 * Toma el tema del snapshot publicado (`useSitio`) y el modo claro/oscuro de
 * `useModoTema`, igual que `PublicHomePage`; si el sitio aún no se publicó o
 * falla la carga, se ve con los tokens por defecto. Va dentro de
 * `LayoutPublico`, que aporta el `<main id="contenido">`.
 */
export function NoEncontradoPage() {
  const { data: snapshot } = useSitio()
  const { modo } = useModoTema()

  return (
    <div
      style={snapshot?.tema ? temaComoVariablesCss(snapshot.tema, modo) : undefined}
      data-tema-modo={modo}
      className={cn(
        'flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-center text-foreground',
        modo === 'oscuro' && 'dark',
      )}
    >
      <MetadatosPagina
        titulo="Página no encontrada"
        descripcion="La página que buscas no existe o fue movida."
      />
      {/* La SPA responde 200: se marca noindex para evitar un soft-404 (Fase 6). */}
      <meta name="robots" content="noindex" />
      <h1 className="text-3xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">
        La página que buscas no existe o fue movida.
      </p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  )
}
