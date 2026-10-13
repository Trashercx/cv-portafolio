import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import type { PuckContext } from '@puckeditor/core'
import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { ProveedorModoRenderizado } from '@/components/publico/contexto-renderizado'
import { useTheme } from '@/components/theme/ThemeProvider'
import { temaComoVariablesCss } from '@/lib/tema-css'
import type { ModoTema } from '@/lib/tema-oscuro'
import { cn } from '@/lib/utils'
import { useFuenteTema } from '@/features/tema/useFuenteTema'
import { useEditorPanelStore } from '@/store/editor-panel-store'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import { leerMetadata } from './useDatosEditor'

/**
 * Scrollbar fina del documento del iframe (Fase 7, UC-07): el scroll del
 * lienzo es el de `<html>` DENTRO del iframe, fuera del alcance de
 * `.scrollbar-fina` del panel. `syncHostStyles` copia al iframe las hojas de
 * estilo del panel (y por tanto `--border`/`--muted-foreground`, incluida la
 * variante `html.dark`, cuyo atributo `class` también se sincroniza), pero
 * `.scrollbar-fina` no aplica al propio `<html>` del iframe, así que la regla
 * equivalente se inyecta aquí.
 */
const ESTILO_SCROLLBAR_IFRAME = `
  html { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
  html::-webkit-scrollbar { width: 8px; height: 8px; }
  html::-webkit-scrollbar-track { background: transparent; }
  html::-webkit-scrollbar-thumb { background-color: var(--border); border-radius: 9999px; }
  html::-webkit-scrollbar-thumb:hover { background-color: var(--muted-foreground); }
`

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
 * - **Modo oscuro reflejado, no aislado (Fase 4.6, corregido)**: el `theme`
 *   del `ThemeProvider` del panel (`'light'`/`'dark'`, chrome del propio
 *   admin) se mapea a `modo: ModoTema` (`'claro'`/`'oscuro'`) y se pasa a
 *   `temaComoVariablesCss` para que el lienzo pinte la paleta oscura
 *   derivada (`lib/tema-oscuro.ts`) cuando el admin tiene el panel en modo
 *   oscuro — mismo comportamiento que tendría el visitante del sitio
 *   público con `prefers-color-scheme: dark` (ver `useModoTema.ts`), así el
 *   editor queda fiel a lo publicado también en modo oscuro. Además de esas
 *   variables CSS, este contenedor también aplica la clase `dark` cuando
 *   `modo === 'oscuro'` (mismo tratamiento que `PublicHomePage`): los
 *   `Bloque*.tsx` usan extensamente el sistema de tokens genérico de
 *   shadcn/Tailwind (`text-muted-foreground`, `bg-card`, etc., gateado por
 *   `.dark {}` en `index.css`), que solo conmuta con esa clase presente en
 *   algún ancestro — pintar solo las variables CSS del tema de negocio no
 *   alcanzaba para esos tokens. Esta clase `dark` es explícita, derivada de
 *   `modo`, y NO la misma fuga que `CopyHostStyles` de Puck copia del
 *   `<html>` padre al `<html>` del iframe (`syncAttributes`): esa fuga
 *   sigue sin usarse para nada acá — el chrome del panel (botones, inputs de
 *   shadcn del propio admin) vive fuera del iframe y sigue sin filtrarse al
 *   contenido del lienzo.
 * - **Red de seguridad de navegación**: los bloques reales usan
 *   `EnlaceBloque` (que no navega en modo `'editor'`), pero por si algún
 *   `<a>` se cuela sin pasar por ahí, este `onClickCapture` cancela
 *   cualquier click cuyo target tenga un `<a>` como ancestro.
 */
export function PuckRoot({ children, puck }: PuckRootProps) {
  const { datos } = leerMetadata(puck)
  const { theme } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const modoDelPanel: ModoTema = theme === 'dark' ? 'oscuro' : 'claro'
  // Fase 7 (UC-08): el toggle "Vista previa en oscuro" del header del editor
  // fuerza el modo SOLO de este lienzo; `null` sigue al panel.
  const modoVistaPrevia = useEditorPanelStore((state) => state.modoVistaPrevia)
  const modo: ModoTema = modoVistaPrevia ?? modoDelPanel
  // Fase 7 (UC-08): fuente variable del tema, bajo demanda.
  useFuenteTema(datos.tema?.fuente_principal)

  // Fase 7 (UC-08): el `<html>` del iframe recibe la clase `dark` del panel
  // (`CopyHostStyles` de Puck sincroniza atributos), lo que mantendría
  // oscuros los tokens de shadcn aunque el override pida claro. Dentro del
  // iframe, este efecto hace de `modo` la única fuente de verdad de esa
  // clase y la re-impone si Puck la vuelve a copiar. Solo actúa en un
  // documento distinto al del panel: sin iframe tocaría el `<html>` del
  // propio admin.
  useEffect(() => {
    const doc = wrapperRef.current?.ownerDocument
    if (!doc || doc === document) return
    const html = doc.documentElement
    const aplicar = () => {
      if (html.classList.contains('dark') !== (modo === 'oscuro')) {
        html.classList.toggle('dark', modo === 'oscuro')
      }
    }
    aplicar()
    const observador = new MutationObserver(aplicar)
    observador.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observador.disconnect()
  }, [modo])

  // Fase 7 (UC-08): `Ctrl/Cmd+S` con el foco DENTRO del iframe. Los eventos de
  // teclado del iframe no burbujean al documento del panel, así que se
  // escucha en el `ownerDocument` de este nodo (el del iframe) y se delega en
  // la acción registrada por `EditorSeccionesPage`.
  useEffect(() => {
    const doc = wrapperRef.current?.ownerDocument
    // Sin iframe (tests, `iframe.enabled=false`) el documento es el del panel,
    // que ya tiene el listener de `EditorSeccionesPage`: registrarlo aquí
    // dispararía el guardado dos veces (Fase 7, UC-07).
    if (!doc || doc === document) return
    const alPresionar = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        useEditorSeccionesStore.getState().accionGuardar?.()
      }
    }
    doc.addEventListener('keydown', alPresionar)
    return () => doc.removeEventListener('keydown', alPresionar)
  }, [])

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest?.('a')) {
      event.preventDefault()
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={datos.tema ? temaComoVariablesCss(datos.tema, modo) : undefined}
      className={cn('relative min-h-svh', modo === 'oscuro' && 'dark')}
      onClickCapture={handleClickCapture}
    >
      <style>{ESTILO_SCROLLBAR_IFRAME}</style>
      {datos.fondo ? <FondoAnimado fondo={datos.fondo} /> : null}
      <div className="relative z-10">
        <ProveedorModoRenderizado modo="editor">
          {children}
        </ProveedorModoRenderizado>
      </div>
    </div>
  )
}
