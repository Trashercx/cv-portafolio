import type { CSSProperties } from 'react'
import type { Tema } from '@/features/tema/types'
import { derivarPaletaOscura, type ModoTema } from './tema-oscuro'

/**
 * Subconjunto de `Tema` necesario para calcular las variables CSS (UC-08).
 * Se tipa como subconjunto (no `Tema` completo) para poder reutilizarse
 * también con el `tema` que llega dentro del snapshot publicado (UC-12),
 * que es estructuralmente igual pero viaja como JSON plano.
 */
export type TemaColores = Pick<
  Tema,
  | 'color_primario'
  | 'color_secundario'
  | 'color_fondo'
  | 'color_texto'
  | 'fuente_principal'
>

/**
 * Mapea los 4 tokens NUEVOS de `fuente_principal` (los únicos que el
 * formulario de Tema ofrece de acá en adelante, ver `tema-schema.ts`) a un
 * stack de `font-family` que sí resuelve visualmente en el navegador. Los
 * valores legados (`'Inter'`, `'Poppins'`, `'Merriweather'`, `'Georgia'`,
 * de temas ya guardados) no están acá a propósito: pasan directo como
 * `font-family` sin traducir (ver el `??` de abajo), preservando el
 * comportamiento previo exacto para no romper temas existentes.
 */
const MAPA_FUENTE_PRINCIPAL: Record<string, string> = {
  manrope: "'Manrope Variable', 'Inter', ui-sans-serif, system-ui, sans-serif",
  sans_sistema:
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif_sistema: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  mono_sistema: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
}

/**
 * Variables CSS del tema (UC-08/UC-12), sin colores hardcodeados en ningún
 * componente. Reutilizada por `TemaPage` (vista previa en el panel) y por el
 * sitio público (`PublicHomePage`), aplicadas sobre el contenedor raíz de
 * cada uno — el tema de la vista previa del panel puede ser distinto al del
 * snapshot publicado si el admin todavía no publicó un cambio de tema.
 *
 * `modo` (Fase 4.6) es opt-in con default `'claro'`: cuando es `'oscuro'`,
 * los 4 colores se reemplazan por la paleta derivada de
 * `derivarPaletaOscura` antes de mapearlos a variables CSS.
 * `fuente_principal` no se ve afectada por el modo.
 */
export function temaComoVariablesCss(
  tema: TemaColores,
  modo: ModoTema = 'claro',
): CSSProperties {
  const colores = modo === 'oscuro' ? derivarPaletaOscura(tema) : tema
  return {
    '--color-primario': colores.color_primario,
    '--color-secundario': colores.color_secundario,
    '--color-fondo': colores.color_fondo,
    '--color-texto': colores.color_texto,
    fontFamily:
      MAPA_FUENTE_PRINCIPAL[tema.fuente_principal] ?? tema.fuente_principal,
    // Bug preexistente (Fase 3.1): `--color-fondo` se declaraba pero nunca
    // se aplicaba como `background-color` en ningún lado — el contenedor
    // raíz de `PublicHomePage`/`PanelVersiones`/`PuckRoot` (editor) queda
    // así siempre pintado con el color de fondo del tema activo, no con el
    // fondo por defecto del navegador.
    backgroundColor: 'var(--color-fondo)',
  } as CSSProperties
}
