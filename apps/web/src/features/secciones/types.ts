import type { Media } from '@/features/media/types'

/**
 * UC-07 (Editar estructura visual). Los tipos de bloque decididos en
 * docs/plan-tecnico.md sección 5 — `Seccion.tipo_seccion` solo puede ser uno
 * de estos valores, cada uno con su propio DTO de `configuracion` en el
 * backend (`apps/api/src/modules/secciones/dto/configuracion/`). Las 6
 * originales (UC-07) más `skills` (UC-07 + UC-16, Fase 2) más `columnas`
 * (UC-17, Fase 3.3 del rediseño del editor — layouts multi-columna con la
 * Slots API de Puck) más `galeria` (UC-18, Fase 4.5 — galería de fotos con
 * carousel/grid y lightbox).
 */
export const TIPOS_SECCION = [
  'hero',
  'sobre-mi',
  'proyectos',
  'certificaciones',
  'logros',
  'contacto',
  'skills',
  'columnas',
  'galeria',
] as const

export type TipoSeccion = (typeof TIPOS_SECCION)[number]

/** Etiqueta legible por tipo, usada como `titulo_visible` por defecto al crear una sección nueva desde el editor. */
export const TIPO_SECCION_LABEL: Record<TipoSeccion, string> = {
  hero: 'Portada',
  'sobre-mi': 'Sobre mí',
  proyectos: 'Proyectos',
  certificaciones: 'Certificaciones',
  logros: 'Logros',
  contacto: 'Contacto',
  skills: 'Skills',
  columnas: 'Columnas',
  galeria: 'Galería',
}

/**
 * Tipos de bloque que se pueden anidar dentro de una columna de un
 * contenedor `columnas` (UC-17). Nunca `'hero'` (la portada ocupa todo el
 * ancho por diseño) ni `'columnas'` (evita anidamiento sin límite) — ver
 * docs/plan-portafolio.md §4, restricción reforzada tanto en el `allow` del
 * slot de Puck (`puck-config.tsx`) como en el DTO del backend. `'galeria'`
 * (UC-18, Fase 4.5) cae automáticamente acá: una galería de fotos puede
 * vivir dentro de una columna igual que cualquier otro bloque de contenido.
 */
export type TipoSeccionAnidable = Exclude<TipoSeccion, 'hero' | 'columnas'>

export type EspaciadoVerticalBloque = 'compacto' | 'normal' | 'amplio'
export type AnchoContenidoBloque = 'estrecho' | 'normal' | 'amplio' | 'completo'
export type AlineacionTextoBloque = 'izquierda' | 'centro'
export type FondoBloqueBloque = 'ninguno' | 'sutil' | 'tarjeta'

/**
 * Fase 3.4 (personalización visual por bloque): campos compartidos por los 9
 * tipos de bloque (`hero`, `sobre-mi`, `proyectos`, `certificaciones`,
 * `logros`, `contacto`, `skills`, `columnas`, `galeria` — este último desde
 * Fase 4.5, UC-18). Todos opcionales con default
 * en el frontend (`apps/web/src/lib/escalas-bloque.ts`) — el backend, en
 * paralelo, valida exactamente estos mismos nombres/valores en cada DTO de
 * `configuracion`. Una `Seccion` guardada antes de esta fase no los trae en
 * su `configuracion` JSONB: cada consumidor debe asumir `undefined` y aplicar
 * el default documentado acá, nunca asumir que el campo existe.
 */
export type BloqueConfiguracionBase = {
  /** @default 'normal' */
  espaciado_vertical?: EspaciadoVerticalBloque
  /** @default 'normal' */
  ancho_contenido?: AnchoContenidoBloque
  /** @default 'izquierda' */
  alineacion_texto?: AlineacionTextoBloque
  /** @default 'ninguno' */
  fondo_bloque?: FondoBloqueBloque
  /** @default true */
  separador_inferior?: boolean
}

export type HeroConfiguracion = BloqueConfiguracionBase & {
  titulo: string
  subtitulo: string
  imagen_fondo_media_id?: string
  /**
   * Solo presente cuando esta `Seccion` viene dentro de un `SnapshotSitio`
   * (UC-12/UC-10): `VersionesSitioService.armarSnapshot` resuelve
   * `imagen_fondo_media_id` a la `Media` completa (mismo patrón que
   * `perfil.imagen_perfil` o `certificacion.logo`). En el editor admin
   * (`GET /admin/secciones`) esto no viene y solo existe `imagen_fondo_media_id`.
   */
  imagen_fondo?: Media
  texto_boton?: string
  enlace_boton?: string
  /**
   * Opcionales en `HeroConfiguracionDto` (backend), con default en el
   * servidor (`mostrar_foto_perfil=false`, `posicion_foto='ninguna'`,
   * `estilo_foto='con_marco'`): así una `Seccion` `hero` guardada antes de
   * agregar estos 3 campos (sin ellos en su `configuracion` JSONB) sigue
   * pudiendo editarse/guardarse sin un 400 por campo faltante. El editor
   * (`puck-config.tsx`) igual les da un valor concreto en `defaultProps`
   * para que una sección nueva siempre parta de una elección explícita.
   */
  mostrar_foto_perfil?: boolean
  posicion_foto?: 'ninguna' | 'centrada' | 'esquina_superior' | 'esquina_inferior'
  estilo_foto?: 'con_marco' | 'sin_fondo'
  /** @default 'normal' */
  altura?: 'normal' | 'grande' | 'pantalla_completa'
  /** @default 'ninguno' */
  overlay_fondo?: 'ninguno' | 'oscuro' | 'claro'
  /** @default 'normal' */
  tamano_titulo?: 'normal' | 'grande'
}

export type SobreMiConfiguracion = BloqueConfiguracionBase & {
  mostrar_foto: boolean
  /** @default 'izquierda' */
  posicion_foto?: 'izquierda' | 'derecha'
  /** @default 'circular' */
  forma_foto?: 'circular' | 'cuadrada'
}

/** `configuracion` para `tipo_seccion = 'skills'` (UC-07 + UC-16). Espeja `SkillsConfiguracionDto`. */
export type SkillsConfiguracion = BloqueConfiguracionBase & {
  direccion: 'izquierda' | 'derecha'
  velocidad: 'lenta' | 'media' | 'rapida'
  /**
   * @default 'lg' — el carrusel ya usa `tamano="lg"` desde Fase 3.2; no
   * cambiar el default acá o cambia el aspecto de todos los sitios ya
   * publicados con este bloque.
   */
  tamano_icono?: 'sm' | 'md' | 'lg'
  /** @default true */
  mostrar_nombres?: boolean
  /** @default true */
  pausar_al_pasar?: boolean
}

export type ProyectosConfiguracion = BloqueConfiguracionBase & {
  cantidad_a_mostrar: number
  solo_destacados: boolean
  /** @default 3 */
  columnas?: 2 | 3
  /** @default 'simple' */
  estilo_tarjeta?: 'simple' | 'con_sombra'
  /** @default true */
  mostrar_descripcion?: boolean
}

export type CertificacionesConfiguracion = BloqueConfiguracionBase & {
  orden: 'fecha' | 'manual'
  /** @default 3 */
  columnas?: 2 | 3
  /** @default 'simple' */
  estilo_tarjeta?: 'simple' | 'con_sombra'
  /** @default true */
  mostrar_fecha?: boolean
}

export type LogrosConfiguracion = BloqueConfiguracionBase & {
  categoria_filtro?: string
  /** @default 'tarjetas' */
  estilo_lista?: 'tarjetas' | 'linea_tiempo'
}

export type ContactoConfiguracion = BloqueConfiguracionBase & {
  mostrar_formulario: boolean
  /** @default 'iconos' */
  estilo_redes?: 'iconos' | 'botones'
}

export type DistribucionColumnas = '1-1' | '1-2' | '2-1' | '1-1-1'
export type AlineacionVerticalColumnas = 'inicio' | 'centro' | 'fin' | 'estirado'
export type EspaciadoColumnas = 'compacto' | 'normal' | 'amplio'

/**
 * Bloque hijo dentro de una columna: misma forma que tendría como `Seccion`
 * propia, SIN `id`/`usuario_admin_id`/`orden` (esos solo existen para filas
 * reales de nivel superior) — ver docs/plan-portafolio.md §4.
 */
export type BloqueColumnaHijo = {
  tipo_seccion: TipoSeccionAnidable
  titulo_visible: string
  visible: boolean
  configuracion: object
}

/**
 * `configuracion` para `tipo_seccion = 'columnas'` (UC-17). Espeja
 * `ColumnasConfiguracionDto` (backend, `apps/api/src/modules/secciones/dto/configuracion/`).
 * `columna_3` está siempre presente, incluso cuando `distribucion` es de 2
 * columnas y queda vacío — así el `render` decide qué se ve, no la forma del
 * dato.
 */
export type ColumnasConfiguracion = BloqueConfiguracionBase & {
  distribucion: DistribucionColumnas
  alineacion_vertical: AlineacionVerticalColumnas
  espaciado: EspaciadoColumnas
  columna_1: BloqueColumnaHijo[]
  columna_2: BloqueColumnaHijo[]
  columna_3: BloqueColumnaHijo[]
}

/**
 * Una foto de la galería (UC-18). `POST/PATCH /admin/secciones` solo acepta
 * `media_id`/`titulo` en el body — nunca `media` (eso lo agrega el backend
 * solo al resolver el snapshot público/preview, mismo patrón que
 * `hero.imagen_fondo` o `certificacion.logo`). En el editor admin, `media` se
 * resuelve en el propio `render` del bloque `galeria` (`puck-config.tsx`)
 * contra `datos.mediaPorId`, nunca persistido tal cual.
 */
export type GaleriaFoto = {
  media_id: string
  titulo?: string
  media?: Media
}

/** `configuracion` para `tipo_seccion = 'galeria'` (UC-18, Fase 4.5). Espeja `GaleriaConfiguracionDto`. */
export type GaleriaConfiguracion = BloqueConfiguracionBase & {
  /** @default [] */
  fotos: GaleriaFoto[]
  /** @default 'carousel' */
  disposicion?: 'carousel' | 'grid'
  /** @default 3 — solo aplica si `disposicion === 'grid'`. */
  columnas_grid?: 2 | 3 | 4
}

export type ConfiguracionPorTipo = {
  hero: HeroConfiguracion
  'sobre-mi': SobreMiConfiguracion
  proyectos: ProyectosConfiguracion
  certificaciones: CertificacionesConfiguracion
  logros: LogrosConfiguracion
  contacto: ContactoConfiguracion
  skills: SkillsConfiguracion
  columnas: ColumnasConfiguracion
  galeria: GaleriaConfiguracion
}

/** Forma exacta de `Seccion` devuelta por `GET /admin/secciones`. */
export type Seccion<T extends TipoSeccion = TipoSeccion> = {
  id: string
  usuario_admin_id: string
  tipo_seccion: T
  titulo_visible: string
  orden: number
  visible: boolean
  configuracion: ConfiguracionPorTipo[T]
}
