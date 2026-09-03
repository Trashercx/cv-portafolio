import type { Media } from '@/features/media/types'

/**
 * UC-07 (Editar estructura visual). Los tipos de bloque decididos en
 * docs/plan-tecnico.md sección 5 — `Seccion.tipo_seccion` solo puede ser uno
 * de estos valores, cada uno con su propio DTO de `configuracion` en el
 * backend (`apps/api/src/modules/secciones/dto/configuracion/`). Las 6
 * originales (UC-07) más `skills` (UC-07 + UC-16, Fase 2) más `columnas`
 * (UC-17, Fase 3.3 del rediseño del editor — layouts multi-columna con la
 * Slots API de Puck).
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
}

/**
 * Tipos de bloque que se pueden anidar dentro de una columna de un
 * contenedor `columnas` (UC-17). Nunca `'hero'` (la portada ocupa todo el
 * ancho por diseño) ni `'columnas'` (evita anidamiento sin límite) — ver
 * docs/plan-portafolio.md §4, restricción reforzada tanto en el `allow` del
 * slot de Puck (`puck-config.tsx`) como en el DTO del backend.
 */
export type TipoSeccionAnidable = Exclude<TipoSeccion, 'hero' | 'columnas'>

export type HeroConfiguracion = {
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
}

export type SobreMiConfiguracion = {
  mostrar_foto: boolean
}

/** `configuracion` para `tipo_seccion = 'skills'` (UC-07 + UC-16). Espeja `SkillsConfiguracionDto`. */
export type SkillsConfiguracion = {
  direccion: 'izquierda' | 'derecha'
  velocidad: 'lenta' | 'media' | 'rapida'
}

export type ProyectosConfiguracion = {
  cantidad_a_mostrar: number
  solo_destacados: boolean
}

export type CertificacionesConfiguracion = {
  orden: 'fecha' | 'manual'
}

export type LogrosConfiguracion = {
  categoria_filtro?: string
}

export type ContactoConfiguracion = {
  mostrar_formulario: boolean
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
export type ColumnasConfiguracion = {
  distribucion: DistribucionColumnas
  alineacion_vertical: AlineacionVerticalColumnas
  espaciado: EspaciadoColumnas
  columna_1: BloqueColumnaHijo[]
  columna_2: BloqueColumnaHijo[]
  columna_3: BloqueColumnaHijo[]
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
