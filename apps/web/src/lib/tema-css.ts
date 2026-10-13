import type { CSSProperties } from 'react'
import type { Tema } from '@/features/tema/types'
import { familiaCssDeFuente } from '@/features/tema/fuentes'
import { paletaEfectiva, type ModoTema } from './tema-oscuro'
import { derivarSuperficiesShadcn } from './tema-superficies'

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
> & {
  /** Modo base del tema (octava ronda, UC-08); ausente = 'claro'. */
  modo?: ModoTema
}

/**
 * Variables CSS del tema (UC-08/UC-12), sin colores hardcodeados en ningún
 * componente. Reutilizada por `PanelTemaEditor` (pestaña "Tema" del panel
 * lateral del editor, antes la extinta `TemaPage`; vista previa en el panel)
 * y por el sitio público (`PublicHomePage`), aplicadas sobre el contenedor raíz de
 * cada uno — el tema de la vista previa del panel puede ser distinto al del
 * snapshot publicado si el admin todavía no publicó un cambio de tema.
 *
 * `modo` es el modo del visitante (default: `tema.modo`, o 'claro'). Desde
 * la octava ronda (UC-08) `Tema.modo` es el modo base: los colores se usan
 * tal cual si coincide con el del visitante y se invierten
 * (`derivarPaletaInversa`) solo si difiere.
 * `fuente_principal` no se ve afectada por el modo.
 */
export function temaComoVariablesCss(
  tema: TemaColores,
  modo: ModoTema = tema.modo ?? 'claro',
): CSSProperties {
  const colores = paletaEfectiva(tema, modo)
  const superficies = derivarSuperficiesShadcn(tema, modo)
  return {
    '--color-primario': colores.color_primario,
    '--color-secundario': colores.color_secundario,
    '--color-fondo': colores.color_fondo,
    '--color-texto': colores.color_texto,
    // Superficies genéricas de shadcn/Tailwind (Fase 4.7, fix de
    // convergencia visual): derivadas del `Tema`, no de los valores fijos de
    // `index.css` — unifica los dos sistemas de color del sitio público en
    // una sola fuente de verdad. `index.css` sigue siendo el fallback del
    // chrome del panel admin, que nunca aplica estas variables.
    '--background': superficies.background,
    '--foreground': superficies.foreground,
    '--card': superficies.card,
    '--card-foreground': superficies.cardForeground,
    '--popover': superficies.popover,
    '--popover-foreground': superficies.popoverForeground,
    '--muted': superficies.muted,
    '--muted-foreground': superficies.mutedForeground,
    '--border': superficies.border,
    '--accent': superficies.accent,
    '--accent-foreground': superficies.accentForeground,
    // Fase 7 (UC-08): catálogo de 10 fuentes + 4 legadas mapeadas a la más
    // parecida (`features/tema/fuentes.ts`); una clave desconocida pasa cruda.
    // La descarga de la fuente variable la dispara `useFuenteTema`.
    fontFamily: familiaCssDeFuente(tema.fuente_principal),
    // Bug preexistente (Fase 3.1): `--color-fondo` se declaraba pero nunca
    // se aplicaba como `background-color` en ningún lado — el contenedor
    // raíz de `PublicHomePage`/`PanelVersiones`/`PuckRoot` (editor) queda
    // así siempre pintado con el color de fondo del tema activo, no con el
    // fondo por defecto del navegador.
    backgroundColor: 'var(--color-fondo)',
    // Fix (5ta ronda): mismo motivo que `backgroundColor` arriba, pero para
    // el texto. La herencia de CSS propaga el VALOR YA RESUELTO de `color`,
    // no una referencia viva a la custom property — así que sobreescribir
    // `--foreground` en este `<div>` no alcanza a los hijos que no vuelven a
    // declarar `color` ellos mismos (la mayoría de los `Bloque*.tsx`, que
    // heredan el `color` que `body` ya resolvió a partir de `--foreground`
    // global de `index.css`, nunca tocado por el sitio público). Declarar
    // `color` explícitamente acá convierte a este `<div>` en el punto real
    // de partida de la herencia para sus descendientes sin color propio.
    color: 'var(--foreground)',
  } as CSSProperties
}
