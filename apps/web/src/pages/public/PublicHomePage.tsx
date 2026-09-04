import { useEffect, useState } from 'react'
import { ProveedorDetallePublico } from '@/components/publico/contexto-detalle'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { Footer } from '@/components/publico/Footer'
import { RenderizadorSecciones } from '@/components/publico/RenderizadorSecciones'
import { ToggleModoTema } from '@/components/publico/ToggleModoTema'
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
 * `ToggleModoTema`, ver más abajo dónde se monta); ese `modo` se pasa a
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
 *
 * `ToggleModoTema` (fix de visibilidad, Fase 4.7) se monta acá como botón
 * flotante fijo en la esquina inferior derecha, en vez de dentro de
 * `Footer`: al fondo del scroll pasaba fácilmente desapercibido para el
 * visitante.
 */
export function PublicHomePage() {
  const { data: snapshot, isLoading, error } = useSitio()
  const { modo } = useModoTema()
  // Nodo DOM del `<div>` raíz temado, expuesto como estado reactivo (no
  // `useRef`, cuyo `.current` no dispara re-render) para que
  // `ProveedorDetallePublico` pueda pasarlo como `container` del modal de
  // detalle (fix tema/modo oscuro en modales públicos) recién cuando el
  // nodo real ya está montado.
  const [nodoRaiz, setNodoRaiz] = useState<HTMLDivElement | null>(null)

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
      ref={setNodoRaiz}
      style={
        snapshot.tema ? temaComoVariablesCss(snapshot.tema, modo) : undefined
      }
      data-tema-modo={modo}
      className={cn('relative min-h-svh', modo === 'oscuro' && 'dark')}
    >
      {snapshot.fondo ? <FondoAnimado fondo={snapshot.fondo} /> : null}
      <div className="relative z-10">
        <ProveedorDetallePublico container={nodoRaiz}>
          <RenderizadorSecciones snapshot={snapshot} />
        </ProveedorDetallePublico>
        <Footer perfil={snapshot.perfil} />
        <div className="fixed bottom-4 right-4 z-50">
          <ToggleModoTema className="shadow-lg" />
        </div>
      </div>
    </div>
  )
}
