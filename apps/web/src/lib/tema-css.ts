import type { CSSProperties } from 'react'
import type { Tema } from '@/features/tema/types'

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
 * Variables CSS del tema (UC-08/UC-12), sin colores hardcodeados en ningún
 * componente. Reutilizada por `TemaPage` (vista previa en el panel) y por el
 * sitio público (`PublicHomePage`), aplicadas sobre el contenedor raíz de
 * cada uno — el tema de la vista previa del panel puede ser distinto al del
 * snapshot publicado si el admin todavía no publicó un cambio de tema.
 */
export function temaComoVariablesCss(tema: TemaColores): CSSProperties {
  return {
    '--color-primario': tema.color_primario,
    '--color-secundario': tema.color_secundario,
    '--color-fondo': tema.color_fondo,
    '--color-texto': tema.color_texto,
    fontFamily: tema.fuente_principal,
  } as CSSProperties
}
