import type { Media } from '@/features/media/types'

/**
 * UC-07 (Editar estructura visual). Los tipos de bloque decididos en
 * docs/plan-tecnico.md sección 5 — `Seccion.tipo_seccion` solo puede ser uno
 * de estos valores, cada uno con su propio DTO de `configuracion` en el
 * backend (`apps/api/src/modules/secciones/dto/configuracion/`). Las 6
 * originales (UC-07) más `skills` (UC-07 + UC-16, Fase 2).
 */
export const TIPOS_SECCION = [
  'hero',
  'sobre-mi',
  'proyectos',
  'certificaciones',
  'logros',
  'contacto',
  'skills',
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
}

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

export type ConfiguracionPorTipo = {
  hero: HeroConfiguracion
  'sobre-mi': SobreMiConfiguracion
  proyectos: ProyectosConfiguracion
  certificaciones: CertificacionesConfiguracion
  logros: LogrosConfiguracion
  contacto: ContactoConfiguracion
  skills: SkillsConfiguracion
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
