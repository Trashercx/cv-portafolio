import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import type { PuckContext } from '@measured/puck'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { ProveedorModoRenderizado } from '@/components/publico/contexto-renderizado'
import { useTheme } from '@/components/theme/ThemeProvider'
import { temaComoVariablesCss } from '@/lib/tema-css'
import { leerMetadata } from './useDatosEditor'

type PuckRootProps = {
  children: ReactNode
  puck: PuckContext
}

/**
 * `config.root.render` del lienzo de Puck (Fase 3.1): replica el árbol raíz
 * de `PublicHomePage` (variables CSS del tema, fondo animado detrás,
 * contenido en un hermano `z-10`) para que el lienzo se vea igual que el
 * sitio público, más dos cuidados propios de vivir dentro de un iframe
 * embebido en el panel de administración:
 *
 * - **Fuga de `.dark`**: `CopyHostStyles` de Puck copia `class="dark"` del
 *   `<html>` padre al `<html>` del iframe al montar (`syncAttributes`, solo
 *   una vez). El `ThemeProvider` del panel pone `.dark` en
 *   `document.documentElement` para el modo oscuro del *chrome* admin, pero
 *   el sitio público nunca tiene esa clase — sin este efecto, el lienzo
 *   heredaría el modo oscuro del panel aunque el tema del sitio no lo
 *   contemple. Se limpia en cada render del `theme` del panel (no solo al
 *   montar) para cubrir el caso de que el admin cambie de tema con el editor
 *   ya abierto. Usa `ownerDocument` del nodo (no `document` global) porque,
 *   aunque el contenido se pinta dentro del iframe vía `createPortal`, sigue
 *   siendo el mismo módulo de React que en el documento padre — `document`
 *   a secas seguiría apuntando al documento equivocado.
 * - **Red de seguridad de navegación**: los bloques reales usan
 *   `EnlaceBloque` (que no navega en modo `'editor'`), pero por si algún
 *   `<a>` se cuela sin pasar por ahí, este `onClickCapture` cancela
 *   cualquier click cuyo target tenga un `<a>` como ancestro.
 */
export function PuckRoot({ children, puck }: PuckRootProps) {
  const { datos } = leerMetadata(puck)
  const { theme } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    wrapperRef.current?.ownerDocument.documentElement.classList.remove('dark')
  }, [theme])

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest?.('a')) {
      event.preventDefault()
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={datos.tema ? temaComoVariablesCss(datos.tema) : undefined}
      className="relative min-h-full"
      onClickCapture={handleClickCapture}
    >
      {datos.fondo ? <FondoAnimado fondo={datos.fondo} /> : null}
      <div className="relative z-10">
        <ProveedorModoRenderizado modo="editor">
          {children}
        </ProveedorModoRenderizado>
      </div>
    </div>
  )
}
