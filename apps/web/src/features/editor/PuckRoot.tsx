import { useRef, type MouseEvent, type ReactNode } from 'react'
import type { PuckContext } from '@measured/puck'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { ProveedorModoRenderizado } from '@/components/publico/contexto-renderizado'
import { useTheme } from '@/components/theme/ThemeProvider'
import { temaComoVariablesCss } from '@/lib/tema-css'
import type { ModoTema } from '@/lib/tema-oscuro'
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
 * - **Modo oscuro reflejado, no aislado (Fase 4.6)**: el `theme` del
 *   `ThemeProvider` del panel (`'light'`/`'dark'`, chrome del propio admin)
 *   se mapea a `modo: ModoTema` (`'claro'`/`'oscuro'`) y se pasa a
 *   `temaComoVariablesCss` para que el lienzo pinte la paleta oscura
 *   derivada (`lib/tema-oscuro.ts`) cuando el admin tiene el panel en modo
 *   oscuro — mismo comportamiento que tendría el visitante del sitio
 *   público con `prefers-color-scheme: dark` (ver `useModoTema.ts`), así el
 *   editor queda fiel a lo publicado también en modo oscuro. Antes de esta
 *   fase, un `useEffect` cortaba activamente la fuga de la clase `.dark`
 *   que `CopyHostStyles` de Puck copia del `<html>` padre al `<html>` del
 *   iframe (`syncAttributes`) — eso servía cuando el sitio público no tenía
 *   ningún soporte de modo oscuro, pero ahora sí lo tiene, así que aislar la
 *   fuga escondería el comportamiento real. La fuga de `.dark` en sí sigue
 *   sin usarse para nada acá: el lienzo nunca lee esa clase, solo lee
 *   `modo`, derivado explícitamente de `theme` — el chrome del panel
 *   (botones, inputs de shadcn con variantes `dark:`) sigue sin filtrarse al
 *   contenido del sitio, que se pinta enteramente vía las variables CSS de
 *   `temaComoVariablesCss`, no vía clases `dark:` de Tailwind.
 * - **Red de seguridad de navegación**: los bloques reales usan
 *   `EnlaceBloque` (que no navega en modo `'editor'`), pero por si algún
 *   `<a>` se cuela sin pasar por ahí, este `onClickCapture` cancela
 *   cualquier click cuyo target tenga un `<a>` como ancestro.
 */
export function PuckRoot({ children, puck }: PuckRootProps) {
  const { datos } = leerMetadata(puck)
  const { theme } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const modo: ModoTema = theme === 'dark' ? 'oscuro' : 'claro'

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest?.('a')) {
      event.preventDefault()
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={datos.tema ? temaComoVariablesCss(datos.tema, modo) : undefined}
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
