import { useEffect } from 'react'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { Footer } from '@/components/publico/Footer'
import { RenderizadorSecciones } from '@/components/publico/RenderizadorSecciones'
import { useSitio } from '@/features/publico/usePublico'
import { useModoTema } from '@/hooks/useModoTema'
import { ApiError } from '@/lib/api-client'
import { temaComoVariablesCss } from '@/lib/tema-css'
import { cn } from '@/lib/utils'

/**
 * UC-12 (Ver el sitio publicado): trae `GET /sitio` (siempre el snapshot de
 * la última versión publicada, nunca contenido en vivo/borrador) y pinta sus
 * secciones visibles, en orden, con el tema del snapshot aplicado como
 * variables CSS (mismo patrón que `TemaPage`, ver `temaComoVariablesCss`).
 *
 * Modo oscuro (Fase 4.6): `useModoTema()` resuelve `prefers-color-scheme`
 * del sistema salvo que el visitante haya elegido un override manual (botón
 * `ToggleModoTema`, montado en `Footer`); ese `modo` se pasa a
 * `temaComoVariablesCss` para pintar la paleta oscura derivada
 * (`lib/tema-oscuro.ts`) en vez de una paleta hardcodeada.
 * `data-tema-modo` queda en el contenedor raíz para overrides puntuales de
 * CSS/QA a futuro, sin uso propio todavía. Además de las variables CSS del
 * tema de negocio, `modo` también controla la clase `dark` del contenedor
 * raíz (fix de bug): los componentes públicos usan extensamente el sistema
 * de tokens genérico de shadcn/Tailwind (`text-muted-foreground`, `bg-card`,
 * etc., definidos en `index.css` bajo `.dark {}`), que solo conmuta cuando
 * algún ancestro tiene esa clase — sin ella, esos tokens quedaban fijos en
 * su valor claro sin importar `modo`.
 */
export function PublicHomePage() {
  const { data: snapshot, isLoading, error } = useSitio()
  const { modo } = useModoTema()

  useEffect(() => {
    if (!snapshot) return
    const perfil = snapshot.perfil
    document.title = perfil
      ? `${perfil.nombre_completo} · ${perfil.titulo_profesional}`
      : 'Portafolio'
  }, [snapshot])

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
      style={
        snapshot.tema ? temaComoVariablesCss(snapshot.tema, modo) : undefined
      }
      data-tema-modo={modo}
      className={cn('relative min-h-svh', modo === 'oscuro' && 'dark')}
    >
      {snapshot.fondo ? <FondoAnimado fondo={snapshot.fondo} /> : null}
      <div className="relative z-10">
        <ProveedorDetallePublico>
          <RenderizadorSecciones snapshot={snapshot} />
        </ProveedorDetallePublico>
        <Footer
          perfil={snapshot.perfil}
          redes={snapshot.redes_sociales}
          cvMedia={snapshot.perfil?.cv_media ?? null}
        />
      </div>
    </div>
  )
}
