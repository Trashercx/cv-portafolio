import type {
  AlineacionTextoBloque,
  AnchoContenidoBloque,
  EspaciadoVerticalBloque,
  FondoBloqueBloque,
} from '@/features/secciones/types'

/**
 * Fase 3.4 (personalización visual por bloque): único lugar de todo el
 * frontend donde un token semántico de `BloqueConfiguracionBase` (lo que se
 * persiste en `Seccion.configuracion`, p. ej. `'amplio'`) se traduce a una
 * clase Tailwind LITERAL. Tailwind v4 solo detecta clases que aparecen como
 * texto literal en el código fuente — nunca las construidas concatenando
 * fragmentos en runtime (`` `py-${n}` ``) — así que cada tabla de abajo
 * enumera sus clases completas a mano, una por token, en vez de derivarlas.
 *
 * Los valores por defecto (`'normal'` / `'ninguno'` / `'izquierda'`) son a
 * propósito la MISMA clase que el código ya usaba hardcodeada antes de esta
 * fase (`py-12`, `max-w-5xl`, sin alineación especial, sin fondo): así una
 * `Seccion` guardada antes de agregar estos campos a su `configuracion`
 * JSONB (donde vienen `undefined`) se ve exactamente igual que siempre en
 * cuanto cada consumidor (`EnvoltorioSeccion`, cada `Bloque*.tsx`) aplica ese
 * mismo default explícito.
 */

export const ESPACIADO_VERTICAL_CLASE: Record<EspaciadoVerticalBloque, string> = {
  compacto: 'py-6',
  normal: 'py-12',
  amplio: 'py-20',
}

export const ANCHO_CONTENIDO_CLASE: Record<AnchoContenidoBloque, string> = {
  estrecho: 'max-w-2xl',
  normal: 'max-w-5xl',
  amplio: 'max-w-7xl',
  completo: 'max-w-none',
}

export const ALINEACION_TEXTO_CLASE: Record<AlineacionTextoBloque, string> = {
  izquierda: '',
  centro: 'text-center',
}

export const FONDO_BLOQUE_CLASE: Record<FondoBloqueBloque, string> = {
  ninguno: '',
  sutil: 'bg-muted/30',
  tarjeta: 'bg-card border rounded-xl',
}

/**
 * UC-18 (Fase 4.5, bloque `galeria`): clases Tailwind literales para
 * `columnas_grid` cuando `disposicion === 'grid'` — mismo criterio de tabla
 * token → clase literal que el resto de este archivo. Responsive: 1 columna
 * en mobile (evita fotos ilegibles/apretadas) y recién a partir de `sm`
 * escala hasta el valor elegido.
 */
export const COLUMNAS_GRID_CLASE: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}
