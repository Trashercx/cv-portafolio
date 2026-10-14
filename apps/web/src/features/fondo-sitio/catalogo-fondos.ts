/**
 * Catálogo de fondos del sitio (Fase 7b, UC-15 ext.). Única fuente de claves,
 * etiquetas, descripciones y distintivo "interactivo": el API replica las
 * claves en `@IsIn` (`CreateFondoSitioDto`) y la galería del panel Fondo, el
 * despachador `FondoAnimado` y los tests leen de aquí.
 */
export const TIPOS_FONDO = [
  'solido',
  'aurora_mesh',
  'malla_puntos',
  'rejilla_perspectiva',
  'particulas_red',
  'ondas_fluidas',
  'haces_luz',
  'degradado_grano',
  'campo_estrellas',
] as const

export type TipoFondo = (typeof TIPOS_FONDO)[number]

export type EntradaCatalogoFondo = {
  tipo: TipoFondo
  nombre: string
  /** Una línea: se muestra bajo la miniatura en la galería. */
  descripcion: string
  /** `true` = reacciona al puntero o al scroll (se apaga con `configuracion.interactivo=false`). */
  interactivo: boolean
}

export const CATALOGO_FONDOS: readonly EntradaCatalogoFondo[] = [
  {
    tipo: 'solido',
    nombre: 'Sólido',
    descripcion: 'Solo el color de fondo del tema, sin movimiento.',
    interactivo: false,
  },
  {
    tipo: 'aurora_mesh',
    nombre: 'Aurora mesh',
    descripcion: 'Manchas de luz difusas en deriva lenta con parallax.',
    interactivo: true,
  },
  {
    tipo: 'malla_puntos',
    nombre: 'Malla de puntos con foco',
    descripcion: 'Rejilla de puntos con una linterna que sigue al cursor.',
    interactivo: true,
  },
  {
    tipo: 'rejilla_perspectiva',
    nombre: 'Rejilla en perspectiva',
    descripcion: 'Suelo en 3D que avanza hacia el horizonte.',
    interactivo: true,
  },
  {
    tipo: 'particulas_red',
    nombre: 'Red de partículas',
    descripcion: 'Nodos conectados que se apartan del cursor.',
    interactivo: true,
  },
  {
    tipo: 'ondas_fluidas',
    nombre: 'Ondas fluidas',
    descripcion: 'Capas de olas que ondulan y siguen el scroll.',
    interactivo: true,
  },
  {
    tipo: 'haces_luz',
    nombre: 'Haces de luz',
    descripcion: 'Rayos diagonales que oscilan e inclinan hacia el cursor.',
    interactivo: true,
  },
  {
    tipo: 'degradado_grano',
    nombre: 'Degradado con grano',
    descripcion: 'Degradado fluido con textura de grano fino.',
    interactivo: false,
  },
  {
    tipo: 'campo_estrellas',
    nombre: 'Campo de estrellas',
    descripcion: 'Estrellas en capas con parpadeo y parallax.',
    interactivo: true,
  },
]

/**
 * Reemplazo de los tipos anteriores a la Fase 7b (la migración de datos del
 * API hace lo mismo en `fondo_sitio`; esto cubre los snapshots ya publicados).
 */
const TIPOS_ANTIGUOS: Record<string, TipoFondo> = {
  degradado_animado: 'degradado_grano',
  aurora_animada: 'aurora_mesh',
  particulas: 'particulas_red',
  cuadricula_animada: 'malla_puntos',
  ondas: 'ondas_fluidas',
  malla_difusa: 'aurora_mesh',
  lineas_diagonales: 'haces_luz',
}

/** Tipo vigente para cualquier clave: nuevos tal cual, antiguos mapeados, desconocidos a `solido`. */
export function normalizarTipoFondo(tipo: string): TipoFondo {
  if ((TIPOS_FONDO as readonly string[]).includes(tipo)) return tipo as TipoFondo
  return TIPOS_ANTIGUOS[tipo] ?? 'solido'
}

export function entradaCatalogo(tipo: string): EntradaCatalogoFondo {
  const normalizado = normalizarTipoFondo(tipo)
  return CATALOGO_FONDOS.find((e) => e.tipo === normalizado) ?? CATALOGO_FONDOS[0]
}

/** Valores por defecto de un fondo nuevo; el API no persiste defaults, así que todo consumidor tolera claves ausentes. */
export const CONFIGURACION_FONDO_DEFAULT = {
  velocidad: 'media',
  opacidad: 0.5,
  intensidad: 'media',
  interactivo: true,
} as const
