/**
 * Forma del snapshot armado por `VersionesSitioService.armarSnapshot()` y
 * guardado en `VersionSitio.snapshot` (jsonb). Es la ÚNICA fuente que debe
 * leer el sitio público (UC-12): incluye todo lo necesario para renderizar
 * sin volver a tocar las tablas en vivo (Perfil, Tema, Seccion, Proyecto,
 * Certificacion, Logro, RedSocial).
 *
 * Los tipos aquí son deliberadamente laxos (no importan los tipos exactos
 * generados por Prisma): el snapshot es JSON plano una vez persistido, y lo
 * que interesa en `publico/` es la forma mínima necesaria para ubicar un
 * elemento por `id` o leer un campo puntual (p. ej. `cv_media.url`).
 */
export interface SnapshotMedia {
  id: string;
  url: string;
  s3_key: string;
  tipo: string;
  ancho: number | null;
  alto: number | null;
  alt_text: string | null;
  [key: string]: unknown;
}

export interface SnapshotPerfil {
  id: string;
  usuario_admin_id: string;
  nombre_completo: string;
  titulo_profesional: string;
  resumen_bio: string;
  ubicacion: string;
  imagen_perfil: SnapshotMedia | null;
  cv_media: SnapshotMedia | null;
  [key: string]: unknown;
}

export interface SnapshotConId {
  id: string;
  [key: string]: unknown;
}

/**
 * `Seccion.configuracion` una vez resuelta para el snapshot: sigue siendo
 * JSON dinámico (varía según `tipo_seccion`, ver
 * `secciones/dto/configuracion`), pero cuando `tipo_seccion='hero'` y trae
 * `imagen_fondo_media_id`, `armarSnapshot()` agrega `imagen_fondo` con la
 * `Media` completa resuelta (mismo patrón que `perfil.imagen_perfil` y
 * `certificacion.logo`), para que el sitio público nunca tenga que resolver
 * ids de media por su cuenta.
 */
export interface SnapshotSeccionConfiguracion {
  imagen_fondo?: SnapshotMedia;
  [key: string]: unknown;
}

export interface SnapshotSeccion extends SnapshotConId {
  tipo_seccion: string;
  configuracion: SnapshotSeccionConfiguracion;
}

export interface SnapshotSitio {
  perfil: SnapshotPerfil | null;
  tema: Record<string, unknown> | null;
  secciones: SnapshotSeccion[];
  proyectos: SnapshotConId[];
  certificaciones: SnapshotConId[];
  logros: SnapshotConId[];
  redes_sociales: SnapshotConId[];
  skills: SnapshotConId[];
  fondo: Record<string, unknown> | null;
}

export const ESTADO_BORRADOR = 'borrador';
export const ESTADO_PUBLICADO = 'publicado';
