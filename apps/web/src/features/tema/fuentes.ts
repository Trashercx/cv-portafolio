/**
 * Catálogo de fuentes del tema (Fase 7, UC-08, contrato de `docs/plan-tecnico.md`
 * 7.2): los 10 valores cerrados de `Tema.fuente_principal` más los 4 legados
 * que el API sigue aceptando. Única fuente de verdad de (1) el `font-family`
 * CSS de cada clave (`lib/tema-css.ts`), (2) el selector con muestra
 * tipográfica del formulario de tema y (3) la carga bajo demanda del paquete
 * `@fontsource-variable/*` correspondiente.
 *
 * Las fuentes variables NO se importan de forma estática: cada `paquete` es
 * un `import()` dinámico (Vite lo separa en un chunk CSS+woff2 propio), de
 * modo que el bundle inicial no crece y el visitante solo descarga la fuente
 * del tema activo. `manrope` no tiene `paquete`: ya se importa estática en
 * `index.css` porque es la fuente de títulos (`--font-heading`) del propio
 * panel. Las tres `*_sistema` son stacks del sistema y tampoco descargan nada.
 */
export type FuenteTema = {
  /** Valor exacto de `Tema.fuente_principal`. */
  clave: string
  /** Nombre visible en el selector. */
  nombre: string
  /** Valor de la propiedad CSS `font-family` (stack completo con fallbacks). */
  familiaCss: string
  /** `import()` del paquete `@fontsource-variable/*`; ausente si no hay nada que descargar. */
  paquete?: () => Promise<unknown>
}

const SANS_SISTEMA =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const SERIF_SISTEMA = "ui-serif, Georgia, Cambria, 'Times New Roman', serif"
const MONO_SISTEMA =
  "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

export const FUENTES_TEMA: FuenteTema[] = [
  {
    clave: 'manrope',
    nombre: 'Manrope',
    familiaCss: `'Manrope Variable', 'Inter', ${SANS_SISTEMA}`,
  },
  {
    clave: 'inter',
    nombre: 'Inter',
    familiaCss: `'Inter Variable', ${SANS_SISTEMA}`,
    paquete: () => import('@fontsource-variable/inter'),
  },
  {
    clave: 'space_grotesk',
    nombre: 'Space Grotesk',
    familiaCss: `'Space Grotesk Variable', ${SANS_SISTEMA}`,
    paquete: () => import('@fontsource-variable/space-grotesk'),
  },
  {
    clave: 'sora',
    nombre: 'Sora',
    familiaCss: `'Sora Variable', ${SANS_SISTEMA}`,
    paquete: () => import('@fontsource-variable/sora'),
  },
  {
    clave: 'dm_sans',
    nombre: 'DM Sans',
    familiaCss: `'DM Sans Variable', ${SANS_SISTEMA}`,
    paquete: () => import('@fontsource-variable/dm-sans'),
  },
  {
    clave: 'playfair_display',
    nombre: 'Playfair Display',
    familiaCss: `'Playfair Display Variable', ${SERIF_SISTEMA}`,
    paquete: () => import('@fontsource-variable/playfair-display'),
  },
  {
    clave: 'jetbrains_mono',
    nombre: 'JetBrains Mono',
    familiaCss: `'JetBrains Mono Variable', ${MONO_SISTEMA}`,
    paquete: () => import('@fontsource-variable/jetbrains-mono'),
  },
  {
    clave: 'sans_sistema',
    nombre: 'Sans del sistema',
    familiaCss: SANS_SISTEMA,
  },
  {
    clave: 'serif_sistema',
    nombre: 'Serif del sistema',
    familiaCss: SERIF_SISTEMA,
  },
  {
    clave: 'mono_sistema',
    nombre: 'Monoespaciada del sistema',
    familiaCss: MONO_SISTEMA,
  },
]

/** Claves que el formulario ofrece y el API acepta como entrada nueva. */
export const CLAVES_FUENTE = FUENTES_TEMA.map((fuente) => fuente.clave) as [
  string,
  ...string[],
]

/**
 * Valores legados de `fuente_principal` (temas guardados antes de la Fase 7),
 * mapeados a la fuente del catálogo más parecida. Antes pasaban crudos como
 * `font-family` sin descargar nada (`Poppins` caía a la fuente por defecto del
 * navegador); ahora resuelven a una fuente real. No se ofrecen como opción
 * nueva en el formulario.
 */
export const FUENTES_LEGADAS: Record<string, string> = {
  Inter: 'inter',
  Poppins: 'dm_sans',
  Merriweather: 'serif_sistema',
  Georgia: 'serif_sistema',
}

/** Resuelve una clave (incluidas las legadas) a su entrada del catálogo. */
export function obtenerFuente(clave: string): FuenteTema | undefined {
  const claveReal = FUENTES_LEGADAS[clave] ?? clave
  return FUENTES_TEMA.find((fuente) => fuente.clave === claveReal)
}

/**
 * `font-family` de una clave de `fuente_principal`. Una clave desconocida se
 * devuelve tal cual (comportamiento previo a la Fase 7: valor crudo).
 */
export function familiaCssDeFuente(clave: string): string {
  return obtenerFuente(clave)?.familiaCss ?? clave
}

/**
 * Cargas ya pedidas: una promesa por paquete para que `cargarFuente` sea
 * idempotente (varias vistas del mismo tema no repiten el `import()`).
 */
const cargas = new Map<string, Promise<void>>()

/**
 * Descarga bajo demanda la fuente de una clave (una sola vez por paquete).
 * Nunca rechaza: si el `import()` falla (red, chunk caído) el texto queda con
 * los fallbacks del stack, así que un error de fuente no rompe la página; se
 * vuelve a permitir el reintento en la siguiente llamada.
 */
export function cargarFuente(clave: string): Promise<void> {
  const fuente = obtenerFuente(clave)
  if (!fuente?.paquete) return Promise.resolve()

  const existente = cargas.get(fuente.clave)
  if (existente) return existente

  const carga = fuente
    .paquete()
    .then(() => undefined)
    .catch(() => {
      cargas.delete(fuente.clave)
    })
  cargas.set(fuente.clave, carga)
  return carga
}

/** Solo para tests: olvida las cargas ya hechas. */
export function reiniciarCargasDeFuentes(): void {
  cargas.clear()
}
