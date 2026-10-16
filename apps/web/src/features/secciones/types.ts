import type { Media } from '@/features/media/types'

/**
 * UC-07 (Editar estructura visual). Los tipos de bloque decididos en
 * docs/plan-tecnico.md sección 5 — `Seccion.tipo_seccion` solo puede ser uno
 * de estos valores, cada uno con su propio DTO de `configuracion` en el
 * backend (`apps/api/src/modules/secciones/dto/configuracion/`). Las 6
 * originales (UC-07) más `skills` (UC-07 + UC-16, Fase 2) más `columnas`
 * (UC-17, Fase 3.3 del rediseño del editor — layouts multi-columna con la
 * Slots API de Puck) más `galeria` (UC-18, Fase 4.5 — galería de fotos con
 * carousel/grid y lightbox) más `navegacion` (Fase 7, 7.2/7.3 — barra de
 * navegación del sitio con enlaces generados desde las secciones).
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
  'navegacion',
  'insignias',
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
  navegacion: 'Navegación',
  insignias: 'Insignias',
}

/**
 * Tipos de bloque que se pueden anidar dentro de una columna de un
 * contenedor `columnas` (UC-17). Nunca `'columnas'` (evita anidamiento sin
 * límite) ni `'navegacion'`; desde la Fase 7j la portada `'hero'` sí — ver
 * docs/plan-portafolio.md §4, restricción reforzada tanto en el `allow` del
 * slot de Puck (`puck-config.tsx`) como en el DTO del backend. `'galeria'`
 * (UC-18, Fase 4.5) cae automáticamente acá: una galería de fotos puede
 * vivir dentro de una columna igual que cualquier otro bloque de contenido.
 */
export type TipoSeccionAnidable = Exclude<TipoSeccion, 'columnas' | 'navegacion'>

export type EspaciadoVerticalBloque = 'compacto' | 'normal' | 'amplio'
export type AnchoContenidoBloque = 'estrecho' | 'normal' | 'amplio' | 'completo'
export type AlineacionTextoBloque = 'izquierda' | 'centro'
export type FondoBloqueBloque = 'ninguno' | 'sutil' | 'tarjeta' | 'degradado' | 'vidrio'
/** Fase 7c (UC-12): contorno de los contenedores y tarjetas de un bloque (`ninguno` = sin recuadros). */
export type BordeBloqueBloque = 'ninguno' | 'sutil' | 'marcado'
/** Fase 7 (7.2, UC-07): animación de entrada al hacer scroll. */
export type AnimacionEntradaBloque =
  | 'ninguna'
  | 'aparecer'
  | 'deslizar_arriba'
  | 'deslizar_lateral'
  | 'escalar'
/** Fase 7 (7.2, UC-07): forma del separador inferior entre bloques. */
export type SeparadorFormaBloque = 'ninguno' | 'onda' | 'diagonal' | 'curva'
/** Fase 7 (7.2): efecto de hover de las tarjetas de proyectos/certificaciones/logros. */
export type EfectoHoverTarjeta = 'ninguno' | 'elevar' | 'inclinar'

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
  /** Fase 7 (7.2). @default 'aparecer' */
  animacion_entrada?: AnimacionEntradaBloque
  /** Fase 7 (7.2). @default 'ninguno' */
  separador_forma?: SeparadorFormaBloque
  /** Fase 7c (UC-12): contorno de contenedores y tarjetas del bloque. @default 'sutil' (aspecto previo) */
  borde_bloque?: BordeBloqueBloque
  /** Fase 7j: mostrar el título en la página. Ausente = `true`. */
  mostrar_titulo?: boolean
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
  /** Fase 7 (7.2). @default 'centrado' */
  disposicion?: 'centrado' | 'dividido' | 'editorial'
  /** Fase 7 (7.2): 0-6 títulos (1-60 caracteres) que rotan bajo el título. */
  titulos_rotativos?: string[]
  /** Fase 7 (7.2): máx. 40 caracteres. */
  texto_boton_secundario?: string
  /** Fase 7 (7.2): URL o ruta del segundo botón. */
  enlace_boton_secundario?: string
  /** Fase 7 (7.2). @default false */
  mostrar_redes?: boolean
  /** Fase 7 (7.2). @default false */
  mostrar_indicador_scroll?: boolean
  /** Fase 7 (7.2). @default 'ninguno' */
  efecto_titulo?: 'ninguno' | 'degradado' | 'resaltado'
  /** Fase 7 (7.2). @default 'ninguna' */
  decoracion_fondo?: 'ninguna' | 'manchas' | 'cuadricula' | 'puntos'
}

export type SobreMiConfiguracion = BloqueConfiguracionBase & {
  mostrar_foto: boolean
  /** @default 'izquierda' */
  posicion_foto?: 'izquierda' | 'derecha'
  /** @default 'circular' */
  forma_foto?: 'circular' | 'cuadrada'
  /** Fase 7 (7.2): 0-4 estadísticas (etiqueta 1-30, valor 1-12 caracteres). */
  estadisticas?: Estadistica[]
  /** Fase 7 (7.2). @default 'simple' */
  estilo_foto?: 'simple' | 'marco_degradado' | 'flotante'
}

/** Una estadística del bloque `sobre-mi` (Fase 7, 7.2). `valor` puede llevar sufijo (`+`, `%`). */
export type Estadistica = { etiqueta: string; valor: string }

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
  /** Fase 7 (7.2). @default 'marquesina' */
  disposicion?: 'marquesina' | 'cuadricula' | 'nube'
  /** Fase 7 (7.2). @default 'simple' */
  estilo_chip?: 'simple' | 'vidrio' | 'contorno'
}

export type ProyectosConfiguracion = BloqueConfiguracionBase & {
  cantidad_a_mostrar: number
  solo_destacados: boolean
  /** @default 3 */
  columnas?: 2 | 3
  /** @default 'simple' */
  estilo_tarjeta?: 'simple' | 'con_sombra' | 'vidrio'
  /** @default true */
  mostrar_descripcion?: boolean
  /** Fase 7 (7.2). @default 'tarjetas' */
  disposicion?: 'tarjetas' | 'bento' | 'lista'
  /** Fase 7 (7.2). @default 'elevar' */
  efecto_hover?: EfectoHoverTarjeta
  /** Fase 7 (7.2). @default true */
  mostrar_tecnologias?: boolean
}

export type CertificacionesConfiguracion = BloqueConfiguracionBase & {
  orden: 'fecha' | 'manual'
  /** @default 3 */
  columnas?: 2 | 3
  /** @default 'simple' */
  estilo_tarjeta?: 'simple' | 'con_sombra' | 'vidrio'
  /** @default true */
  mostrar_fecha?: boolean
  /** Fase 7 (7.2). @default 'elevar' */
  efecto_hover?: EfectoHoverTarjeta
}

export type LogrosConfiguracion = BloqueConfiguracionBase & {
  categoria_filtro?: string
  /** @default 'tarjetas' */
  estilo_lista?: 'tarjetas' | 'linea_tiempo'
  /** Fase 7 (7.2). @default 'elevar' */
  efecto_hover?: EfectoHoverTarjeta
}

export type ContactoConfiguracion = BloqueConfiguracionBase & {
  mostrar_formulario: boolean
  /** @default 'iconos' */
  estilo_redes?: 'iconos' | 'botones'
  /** Fase 7 (7.2). @default 'simple' */
  estilo?: 'simple' | 'tarjeta_destacada'
  /** Fase 7 (7.2): máx. 120 caracteres; titular de `tarjeta_destacada`. */
  texto_llamada?: string
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
  /** @default 'carousel'. Fase 7j: + mosaico, masonry y cinta. */
  disposicion?: DisposicionGaleria
  /** @default 3 — aplica a grilla y masonry. */
  columnas_grid?: 2 | 3 | 4
  /** Fase 7 (7.2). @default 'zoom'. Fase 7j: + grises e inclinar. */
  efecto_hover?: 'ninguno' | 'zoom' | 'elevar' | 'grises' | 'inclinar'
  // Fase 7j: opcionales sin default persistido (ausente = aspecto previo).
  /** 'automatica' o ausente = la de antes según la disposición. */
  proporcion?: 'automatica' | 'cuadrada' | 'horizontal' | 'panoramica' | 'vertical'
  separacion?: 'ninguna' | 'compacta' | 'normal' | 'amplia'
  esquinas?: 'rectas' | 'suaves' | 'redondeadas'
  /** Ausente = 'nunca'. */
  mostrar_titulos?: 'nunca' | 'al_pasar' | 'siempre'
  /** Ausente = 'ninguna'. */
  aparicion_fotos?: 'ninguna' | 'escalonada' | 'zoom_suave'
  reproduccion_automatica?: boolean
  /** 2–15; ausente = 5. */
  intervalo_segundos?: number
  /** Ausente = 'normal'. */
  velocidad_cinta?: 'lenta' | 'normal' | 'rapida'
  /** Ausente = `true`. */
  ampliar_al_clic?: boolean
}

export type DisposicionGaleria = 'carousel' | 'grid' | 'mosaico' | 'masonry' | 'cinta'

/**
 * `configuracion` para `tipo_seccion = 'navegacion'` (Fase 7, 7.2/7.3). Espeja
 * `NavegacionConfiguracionDto`. Los enlaces no se configuran: se generan con las
 * secciones visibles con título (excepto `hero` y `navegacion`), ancla
 * `#seccion-{id}`. Nunca se admite dentro de `columnas` (igual que `hero`).
 */
export type NavegacionConfiguracion = BloqueConfiguracionBase & {
  /** @default 'flotante' */
  estilo?: 'flotante' | 'barra'
  /** @default true */
  fijo?: boolean
  /** @default true */
  mostrar_nombre?: boolean
  /** @default true */
  mostrar_cv?: boolean
  /** @default true */
  mostrar_toggle_modo?: boolean
  /** @default false */
  mostrar_progreso_scroll?: boolean
}

/**
 * `configuracion` para `tipo_seccion = 'insignias'` (Fase 7d, UC-35). Espeja
 * `InsigniasConfiguracionDto`. Las insignias en sí (entidad `insignia`) no
 * viven en la configuración: se leen del snapshot (`insignias[]`) o, en el
 * lienzo, de `admin/insignias`. Se permite dentro de `columnas`.
 */
export type InsigniasConfiguracion = BloqueConfiguracionBase & {
  titulo?: string
  subtitulo?: string
  /** @default 'auto' */
  columnas?: 2 | 3 | 4 | 'auto'
  /** @default 'normal' */
  tamano?: 'compacto' | 'normal' | 'grande'
  /** @default 'inclinar_brillo' */
  efecto_hover?: 'inclinar_brillo' | 'girar' | 'elevar' | 'ninguno'
  /** Fase 7h. @default 'medalla' */
  estilo?: 'medalla' | 'tarjeta'
  /** Fase 7h, solo medalla. @default 'flotar' */
  animacion_reposo?: 'flotar' | 'balanceo' | 'destello' | 'ninguna'
  /** Fase 7h, solo medalla. @default 'halo' */
  marco_medalla?: 'halo' | 'aro' | 'cinta' | 'ninguno'
  /** Fase 7h, solo medalla. @default 'al_pasar' */
  etiqueta_medalla?: 'al_pasar' | 'siempre' | 'nunca'
  /** @default true */
  mostrar_emisor?: boolean
  /** @default true */
  mostrar_fecha?: boolean
  /** @default false */
  mostrar_habilidades?: boolean
  /** @default true */
  mostrar_enlace?: boolean
  /** 1-50; sin valor = todas. */
  limite?: number
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
  navegacion: NavegacionConfiguracion
  insignias: InsigniasConfiguracion
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
