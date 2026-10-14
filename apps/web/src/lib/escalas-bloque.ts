import type {
  AlineacionTextoBloque,
  AnchoContenidoBloque,
  BordeBloqueBloque,
  EspaciadoVerticalBloque,
  FondoBloqueBloque,
  SeparadorFormaBloque,
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

/**
 * Fase 7c (UC-12): contornos opcionales. `EnvoltorioSeccion` fija en la
 * sección las variables `--ancho-borde` y `--color-borde` según
 * `borde_bloque` (`BORDE_BLOQUE_VARIABLES`) y TODO contenedor o tarjeta de
 * bloque que lleve contorno usa `CLASES_BORDE_BLOQUE`, que las lee con el
 * valor `sutil` como respaldo (así un componente fuera de un envoltorio se
 * ve como siempre). Literales a propósito (Tailwind no ve clases armadas en
 * runtime). `sutil` es el aspecto anterior a la fase.
 */
export const BORDE_BLOQUE_VARIABLES: Record<BordeBloqueBloque, Record<'--ancho-borde' | '--color-borde', string>> = {
  ninguno: { '--ancho-borde': '0px', '--color-borde': 'transparent' },
  sutil: { '--ancho-borde': '1px', '--color-borde': 'var(--border)' },
  marcado: {
    '--ancho-borde': '2px',
    '--color-borde': 'color-mix(in oklab, var(--color-primario) 60%, transparent)',
  },
}

/** Contorno de contenedores y tarjetas (todos los lados). */
export const CLASES_BORDE_BLOQUE =
  'border-[length:var(--ancho-borde,1px)] border-[color:var(--color-borde,var(--border))]'

/** Solo el borde inferior (barra de navegación de ancho completo). */
export const CLASES_BORDE_INFERIOR_BLOQUE =
  'border-b-[length:var(--ancho-borde,1px)] border-b-[color:var(--color-borde,var(--border))]'

/**
 * Contornos con un grosor base mayor (anillo de la foto del hero, borde del
 * botón secundario, marco de la foto de sobre-mi, línea de tiempo de logros):
 * el grosor es un múltiplo de `--ancho-borde`, de modo que `sutil` conserva
 * el aspecto previo (2 y 4 px), `ninguno` los quita y `marcado` los duplica.
 */
export const GROSOR_BORDE_X2_CLASE = 'border-[length:calc(var(--ancho-borde,1px)*2)]'
export const GROSOR_BORDE_X4_CLASE = 'border-[length:calc(var(--ancho-borde,1px)*4)]'
/** Línea de tiempo de logros: solo el lado izquierdo, grosor 2 px con `sutil`. */
export const LINEA_BORDE_BLOQUE_CLASE =
  'border-l-[length:calc(var(--ancho-borde,1px)*2)] border-l-[color:var(--color-borde,var(--border))]'

export const FONDO_BLOQUE_CLASE: Record<FondoBloqueBloque, string> = {
  ninguno: '',
  sutil: 'bg-muted/30',
  // Fase 7c (UC-12): el contorno sale de `CLASES_BORDE_BLOQUE` (opcional por bloque).
  tarjeta: `bg-card ${CLASES_BORDE_BLOQUE} rounded-xl`,
  // Fase 7 (7.2/7.3, UC-12): degradado suave primario -> secundario al 12 %
  // sobre el fondo del tema, y vidrio (tarjeta translúcida con desenfoque).
  degradado:
    'bg-linear-to-br from-[var(--color-primario)]/12 to-[var(--color-secundario)]/12',
  vidrio: `bg-card/60 backdrop-blur ${CLASES_BORDE_BLOQUE} rounded-2xl`,
}

/**
 * Fase 7 (7.3, UC-12): `separador_forma`. Trazo (viewBox `0 0 1200 40`,
 * `preserveAspectRatio="none"`) de la banda decorativa al pie de la sección.
 * `ninguno` no tiene trazo. Decisión de color: se rellena con
 * `--color-primario` al 15 % (`SEPARADOR_RELLENO_CLASE`) en vez de con el
 * fondo del bloque siguiente, porque así es visible con cualquier
 * `fondo_bloque` (también sin fondo) y no depende de conocer al vecino.
 */
export const SEPARADOR_FORMA_TRAZO: Record<Exclude<SeparadorFormaBloque, 'ninguno'>, string> = {
  onda: 'M0 22 C200 44 400 0 600 22 S1000 44 1200 22 L1200 40 L0 40 Z',
  diagonal: 'M0 40 L1200 4 L1200 40 Z',
  curva: 'M0 40 C300 0 900 0 1200 40 Z',
}

export const SEPARADOR_RELLENO_CLASE = 'fill-[var(--color-primario)]/15'

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
